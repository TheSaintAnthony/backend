import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { and, eq, isNull, gte, lte, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { RESERVATION_STATUS_NAMES } from 'src/constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly frontendUrl: string;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://stanthony.pt';
  }

  /**
   * Check-in reminder: Runs every 3 hours
   * Finds confirmed reservations with check-in between 12-48 hours from now
   * that haven't received a reminder yet
   */
  @Cron('0 */3 * * *')
  async sendCheckInReminders() {
    this.logger.log('Starting check-in reminder job...');

    try {
      const now = new Date();
      // Send reminders for check-ins between 12-48 hours from now
      const hoursFrom12 = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const hoursFrom48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Get confirmed status ID
      const [confirmedStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(schema.reservationStatus.name, RESERVATION_STATUS_NAMES.CONFIRMED),
        );

      if (!confirmedStatus) {
        this.logger.warn('Confirmed status not found');
        return;
      }

      // Find reservations that need check-in reminders
      const reservationsToNotify = await this.db
        .select({
          reservationId: schema.reservations.id,
          userId: schema.reservations.userId,
          specialRequests: schema.reservations.specialRequests,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
          userEmail: schema.users.email,
          roomId: schema.reservationRooms.id,
          checkIn: schema.reservationRooms.checkIn,
          checkOut: schema.reservationRooms.checkOut,
          accessCode: schema.reservationRooms.accessCode,
          guestsCount: schema.reservationRooms.guestsCount,
          roomName: schema.rooms.name,
          propertyId: schema.properties.id,
          propertyName: schema.properties.name,
          propertyEmail: schema.properties.email,
          propertyPhone: schema.properties.phoneNumber,
          checkInTime: schema.properties.checkInTime,
          arrivalInstructions: schema.properties.arrivalInstructions,
          addressStreet: schema.addresses.street,
          addressCity: schema.addresses.city,
          addressZipCode: schema.addresses.zipCode,
          addressCountry: schema.addresses.country,
        })
        .from(schema.reservations)
        .innerJoin(
          schema.users,
          eq(schema.reservations.userId, schema.users.id),
        )
        .innerJoin(
          schema.reservationRooms,
          eq(schema.reservations.id, schema.reservationRooms.reservationId),
        )
        .innerJoin(
          schema.rooms,
          eq(schema.reservationRooms.roomId, schema.rooms.id),
        )
        .innerJoin(
          schema.properties,
          eq(schema.rooms.propertyId, schema.properties.id),
        )
        .leftJoin(
          schema.addresses,
          eq(schema.properties.addressId, schema.addresses.id),
        )
        .where(
          and(
            eq(schema.reservations.statusId, confirmedStatus.id),
            isNull(schema.reservations.checkinReminderSentAt),
            isNull(schema.reservations.deletedAt),
            isNull(schema.reservationRooms.deletedAt),
            gte(
              schema.reservationRooms.checkIn,
              hoursFrom12.toISOString().split('T')[0],
            ),
            lte(
              schema.reservationRooms.checkIn,
              hoursFrom48.toISOString().split('T')[0],
            ),
          ),
        );

      this.logger.log(
        `Found ${reservationsToNotify.length} reservations for check-in reminders`,
      );

      // Group by reservation ID to handle multiple rooms
      const reservationMap = new Map<
        string,
        (typeof reservationsToNotify)[0]
      >();
      for (const row of reservationsToNotify) {
        if (!reservationMap.has(row.reservationId)) {
          reservationMap.set(row.reservationId, row);
        }
      }

      for (const [reservationId, data] of reservationMap) {
        const propertyAddress = [
          data.addressStreet,
          data.addressCity,
          data.addressZipCode,
          data.addressCountry,
        ]
          .filter(Boolean)
          .join(', ');

        await this.emailQueue.add('sendCheckInReminderEmail', {
          data: {
            userName: `${data.userFirstName} ${data.userLastName}`,
            email: data.userEmail,
            reservationId: data.reservationId,
            checkInDate: data.checkIn,
            checkOutDate: data.checkOut,
            propertyName: data.propertyName,
            propertyAddress,
            propertyPhone: data.propertyPhone,
            propertyEmail: data.propertyEmail,
            checkInTime: data.checkInTime,
            arrivalInstructions: data.arrivalInstructions || undefined,
            accessCode: data.accessCode,
            roomName: data.roomName,
            guestsCount: data.guestsCount,
            specialRequests: data.specialRequests || undefined,
          },
        });

        // Mark as sent
        await this.db
          .update(schema.reservations)
          .set({ checkinReminderSentAt: new Date() })
          .where(eq(schema.reservations.id, reservationId));

        this.logger.log(
          `Queued check-in reminder for reservation ${reservationId}`,
        );
      }

      this.logger.log('Check-in reminder job completed');
    } catch (error) {
      this.logger.error('Error in check-in reminder job:', error);
    }
  }

  /**
   * Check-out reminder: Runs every 4 hours
   * Finds checked-in reservations with check-out today
   * that haven't received a reminder yet
   */
  @Cron('0 */4 * * *')
  async sendCheckOutReminders() {
    this.logger.log('Starting check-out reminder job...');

    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Get confirmed and checked_in status IDs
      const [confirmedStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(schema.reservationStatus.name, RESERVATION_STATUS_NAMES.CONFIRMED),
        );

      const [checkedInStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(
            schema.reservationStatus.name,
            RESERVATION_STATUS_NAMES.CHECKED_IN,
          ),
        );

      const validStatusIds = [confirmedStatus?.id, checkedInStatus?.id].filter(
        Boolean,
      );

      if (validStatusIds.length === 0) {
        this.logger.warn('No valid statuses found for check-out reminders');
        return;
      }

      // Find reservations that need check-out reminders
      const reservationsToNotify = await this.db
        .select({
          reservationId: schema.reservations.id,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
          userEmail: schema.users.email,
          checkOut: schema.reservationRooms.checkOut,
          roomName: schema.rooms.name,
          propertyName: schema.properties.name,
          checkOutTime: schema.properties.checkOutTime,
        })
        .from(schema.reservations)
        .innerJoin(
          schema.users,
          eq(schema.reservations.userId, schema.users.id),
        )
        .innerJoin(
          schema.reservationRooms,
          eq(schema.reservations.id, schema.reservationRooms.reservationId),
        )
        .innerJoin(
          schema.rooms,
          eq(schema.reservationRooms.roomId, schema.rooms.id),
        )
        .innerJoin(
          schema.properties,
          eq(schema.rooms.propertyId, schema.properties.id),
        )
        .where(
          and(
            sql`${schema.reservations.statusId} IN (${sql.join(
              validStatusIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
            isNull(schema.reservations.checkoutReminderSentAt),
            isNull(schema.reservations.deletedAt),
            isNull(schema.reservationRooms.deletedAt),
            gte(
              sql`${schema.reservationRooms.checkOut}::date`,
              startOfDay.toISOString().split('T')[0],
            ),
            lte(
              sql`${schema.reservationRooms.checkOut}::date`,
              endOfDay.toISOString().split('T')[0],
            ),
          ),
        );

      this.logger.log(
        `Found ${reservationsToNotify.length} reservations for check-out reminders`,
      );

      // Group by reservation ID
      const reservationMap = new Map<
        string,
        (typeof reservationsToNotify)[0]
      >();
      for (const row of reservationsToNotify) {
        if (!reservationMap.has(row.reservationId)) {
          reservationMap.set(row.reservationId, row);
        }
      }

      for (const [reservationId, data] of reservationMap) {
        await this.emailQueue.add('sendCheckOutReminderEmail', {
          data: {
            userName: `${data.userFirstName} ${data.userLastName}`,
            email: data.userEmail,
            reservationId: data.reservationId,
            checkOutDate: data.checkOut,
            propertyName: data.propertyName,
            checkOutTime: data.checkOutTime,
            roomName: data.roomName,
          },
        });

        // Mark as sent
        await this.db
          .update(schema.reservations)
          .set({ checkoutReminderSentAt: new Date() })
          .where(eq(schema.reservations.id, reservationId));

        this.logger.log(
          `Queued check-out reminder for reservation ${reservationId}`,
        );
      }

      this.logger.log('Check-out reminder job completed');
    } catch (error) {
      this.logger.error('Error in check-out reminder job:', error);
    }
  }

  /**
   * Post-stay email: Runs daily at 2 PM
   * Finds completed reservations that checked out yesterday
   * that haven't received a post-stay email yet
   */
  @Cron('0 14 * * *')
  async sendPostStayEmails() {
    this.logger.log('Starting post-stay email job...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get completed or checked_out status IDs
      const [completedStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(schema.reservationStatus.name, RESERVATION_STATUS_NAMES.COMPLETED),
        );

      const [checkedOutStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(
            schema.reservationStatus.name,
            RESERVATION_STATUS_NAMES.CHECKED_OUT,
          ),
        );

      // Also include confirmed/checked_in where checkout date was yesterday
      const [confirmedStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(schema.reservationStatus.name, RESERVATION_STATUS_NAMES.CONFIRMED),
        );

      const [checkedInStatus] = await this.db
        .select()
        .from(schema.reservationStatus)
        .where(
          eq(
            schema.reservationStatus.name,
            RESERVATION_STATUS_NAMES.CHECKED_IN,
          ),
        );

      const validStatusIds = [
        completedStatus?.id,
        checkedOutStatus?.id,
        confirmedStatus?.id,
        checkedInStatus?.id,
      ].filter(Boolean);

      if (validStatusIds.length === 0) {
        this.logger.warn('No valid statuses found for post-stay emails');
        return;
      }

      // Find reservations that need post-stay emails
      const reservationsToNotify = await this.db
        .select({
          reservationId: schema.reservations.id,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
          userEmail: schema.users.email,
          checkIn: schema.reservationRooms.checkIn,
          checkOut: schema.reservationRooms.checkOut,
          propertyName: schema.properties.name,
        })
        .from(schema.reservations)
        .innerJoin(
          schema.users,
          eq(schema.reservations.userId, schema.users.id),
        )
        .innerJoin(
          schema.reservationRooms,
          eq(schema.reservations.id, schema.reservationRooms.reservationId),
        )
        .innerJoin(
          schema.rooms,
          eq(schema.reservationRooms.roomId, schema.rooms.id),
        )
        .innerJoin(
          schema.properties,
          eq(schema.rooms.propertyId, schema.properties.id),
        )
        .where(
          and(
            sql`${schema.reservations.statusId} IN (${sql.join(
              validStatusIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
            isNull(schema.reservations.postStayEmailSentAt),
            isNull(schema.reservations.deletedAt),
            isNull(schema.reservationRooms.deletedAt),
            eq(sql`${schema.reservationRooms.checkOut}::date`, yesterdayStr),
          ),
        );

      this.logger.log(
        `Found ${reservationsToNotify.length} reservations for post-stay emails`,
      );

      // Group by reservation ID
      const reservationMap = new Map<
        string,
        (typeof reservationsToNotify)[0]
      >();
      for (const row of reservationsToNotify) {
        if (!reservationMap.has(row.reservationId)) {
          reservationMap.set(row.reservationId, row);
        }
      }

      for (const [reservationId, data] of reservationMap) {
        await this.emailQueue.add('sendPostStayEmail', {
          data: {
            userName: `${data.userFirstName} ${data.userLastName}`,
            email: data.userEmail,
            reservationId: data.reservationId,
            propertyName: data.propertyName,
            checkInDate: data.checkIn,
            checkOutDate: data.checkOut,
            feedbackUrl: `${this.frontendUrl}/account/problems?reservationId=${reservationId}`,
          },
        });

        // Mark as sent
        await this.db
          .update(schema.reservations)
          .set({ postStayEmailSentAt: new Date() })
          .where(eq(schema.reservations.id, reservationId));

        this.logger.log(
          `Queued post-stay email for reservation ${reservationId}`,
        );
      }

      this.logger.log('Post-stay email job completed');
    } catch (error) {
      this.logger.error('Error in post-stay email job:', error);
    }
  }
}

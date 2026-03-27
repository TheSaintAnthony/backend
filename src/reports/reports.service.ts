import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, gte, isNull, lte, or, SQL, sql } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import {
  CreateReportDto,
  DateRangeDto,
  DailyOperationsDto,
  FinancialSummaryDto,
  GetReportsDto,
  MonthlyReservationsDto,
  OccurrencesReportDto,
  UpdateReportDto,
} from './dto';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { getReservationDetails } from './helpers/reservation-query.helper';

type Report = typeof schema.reports.$inferSelect;

interface RevenueAllocationRow {
  invoiceId: string;
  reservationId: string;
  totalAmount: string;
  invoiceStatusName: string | null;
  propertyId: string | null;
  propertyName: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
}

interface ReservationRangeRow {
  reservationId: string;
  userId: string;
  createdAt: Date;
  totalPrice: string;
  statusId: string;
  statusName: string | null;
  checkIn: string | null;
  propertyId: string | null;
}

@Injectable()
export class ReportsService extends BaseCrudService<
  Report,
  CreateReportDto,
  UpdateReportDto,
  GetReportsDto
> {
  constructor(
    @Inject(DB_PROVIDER)
    db: NodePgDatabase<typeof schema>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    super(db, {
      table: schema.reports,
      entityName: 'Report',
      defaultOrderBy: schema.reports.createdAt,
    });
  }

  protected transformCreateData(data: CreateReportDto) {
    return {
      ...data,
      occurrenceDate: new Date(data.occurrenceDate),
      status: 'pending',
    };
  }

  protected async afterCreate(
    entity: Report,
    createData?: CreateReportDto,
  ): Promise<void> {
    if (!entity.isAnonymous && entity.reporterEmail && entity.reporterName) {
      await this.emailQueue.add('sendReportConfirmation', {
        data: {
          reporterName: entity.reporterName,
          reporterEmail: entity.reporterEmail,
          subject: entity.subject,
          relationship: entity.relationship,
          occurrenceDate: entity.occurrenceDate.toISOString(),
          submittedAt: entity.createdAt.toISOString(),
          reportId: entity.id,
          locale: createData?.locale || 'pt',
        },
      });
    }
  }

  protected getWhereConditions(query?: GetReportsDto): SQL[] {
    const conditions: SQL[] = [];
    if (query?.status) {
      conditions.push(eq(schema.reports.status, query.status));
    }
    return conditions;
  }

  async createReport(data: CreateReportDto) {
    return this.create(data);
  }

  async getReports(query: GetReportsDto) {
    return this.getAll(query);
  }

  async getReportById(id: string) {
    return this.getById(id);
  }

  async updateReport(id: string, data: UpdateReportDto) {
    const existing = await this.getById(id);
    const updated = await this.update(id, data);

    if (
      data.status &&
      data.status !== existing.status &&
      !updated.isAnonymous &&
      updated.reporterEmail &&
      updated.reporterName
    ) {
      await this.emailQueue.add('sendReportStatusUpdate', {
        data: {
          reporterName: updated.reporterName,
          reporterEmail: updated.reporterEmail,
          reportId: updated.id,
          oldStatus: existing.status,
          newStatus: updated.status,
          updatedAt:
            updated.updatedAt?.toISOString() ?? new Date().toISOString(),
        },
      });
    }

    return updated;
  }

  async getAnalytics(query: DateRangeDto) {
    const [revenue, bookings, occupancy, customers] = await Promise.all([
      this.getRevenueReport(query),
      this.getBookingsReport(query),
      this.getOccupancyReport(query),
      this.getCustomersReport(query),
    ]);

    return {
      revenue,
      bookings,
      occupancy,
      customers,
    };
  }

  async getRevenueReport(query: DateRangeDto) {
    const rows = await this.getRevenueAllocationRows(query);
    const invoiceMap = new Map<
      string,
      {
        reservationId: string;
        totalAmount: number;
        statusName: string;
      }
    >();

    for (const row of rows) {
      if (!invoiceMap.has(row.invoiceId)) {
        invoiceMap.set(row.invoiceId, {
          reservationId: row.reservationId,
          totalAmount: this.toNumber(row.totalAmount),
          statusName: this.normalizeStatus(row.invoiceStatusName),
        });
      }
    }

    const byProperty = new Map<
      string,
      {
        propertyId: string;
        propertyName: string;
        revenue: number;
        bookingIds: Set<string>;
      }
    >();
    const byRoomType = new Map<
      string,
      {
        roomTypeId: string;
        roomTypeName: string;
        revenue: number;
        bookingIds: Set<string>;
      }
    >();
    const groupedByInvoice = this.groupBy(rows, (row) => row.invoiceId);

    for (const [invoiceId, invoiceRows] of groupedByInvoice.entries()) {
      const invoice = invoiceMap.get(invoiceId);
      if (!invoice || invoiceRows.length === 0) continue;

      const revenueShare = invoice.totalAmount / invoiceRows.length;

      for (const row of invoiceRows) {
        if (row.propertyId) {
          const current = byProperty.get(row.propertyId) || {
            propertyId: row.propertyId,
            propertyName: row.propertyName || 'N/A',
            revenue: 0,
            bookingIds: new Set<string>(),
          };
          current.revenue += revenueShare;
          current.bookingIds.add(invoice.reservationId);
          byProperty.set(row.propertyId, current);
        }

        if (row.roomTypeId) {
          const current = byRoomType.get(row.roomTypeId) || {
            roomTypeId: row.roomTypeId,
            roomTypeName: row.roomTypeName || 'N/A',
            revenue: 0,
            bookingIds: new Set<string>(),
          };
          current.revenue += revenueShare;
          current.bookingIds.add(invoice.reservationId);
          byRoomType.set(row.roomTypeId, current);
        }
      }
    }

    const totalRevenue = Array.from(invoiceMap.values()).reduce(
      (sum, invoice) => sum + invoice.totalAmount,
      0,
    );
    const outstandingInvoices = Array.from(invoiceMap.values()).filter(
      (invoice) => ['pending', 'overdue'].includes(invoice.statusName),
    );
    const totalBookings = new Set(
      Array.from(invoiceMap.values()).map((invoice) => invoice.reservationId),
    ).size;

    return {
      overview: {
        totalRevenue: totalRevenue.toFixed(2),
        totalBookings,
        averageBookingValue:
          totalBookings > 0 ? totalRevenue / totalBookings : 0,
        outstandingAmount: outstandingInvoices
          .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
          .toFixed(2),
        outstandingInvoices: outstandingInvoices.length,
      },
      byProperty: Array.from(byProperty.values())
        .map((item) => ({
          propertyId: item.propertyId,
          propertyName: item.propertyName,
          revenue: item.revenue.toFixed(2),
          bookingCount: item.bookingIds.size,
        }))
        .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
      byRoomType: Array.from(byRoomType.values())
        .map((item) => ({
          roomTypeId: item.roomTypeId,
          roomTypeName: item.roomTypeName,
          revenue: item.revenue.toFixed(2),
          bookingCount: item.bookingIds.size,
        }))
        .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
      byPaymentMethod: [],
    };
  }

  async getBookingsReport(query: DateRangeDto) {
    const rows = await this.getReservationRows(query);
    const grouped = this.groupBy(rows, (row) => row.reservationId);
    const reservations = Array.from(grouped.values()).map((items) => {
      const first = items[0];
      const earliestCheckIn = items
        .map((item) => item.checkIn)
        .filter((value): value is string => Boolean(value))
        .sort()[0];

      return {
        reservationId: first.reservationId,
        createdAt: first.createdAt,
        totalPrice: this.toNumber(first.totalPrice),
        statusId: first.statusId,
        statusName: this.normalizeStatus(first.statusName),
        earliestCheckIn,
      };
    });

    const byStatus = new Map<
      string,
      {
        statusId: string;
        statusName: string;
        count: number;
        totalValue: number;
      }
    >();
    const trends = new Map<string, { count: number; revenue: number }>();
    let leadTimeTotal = 0;
    let leadTimeCount = 0;
    let cancelledBookings = 0;

    for (const reservation of reservations) {
      const current = byStatus.get(reservation.statusId) || {
        statusId: reservation.statusId,
        statusName: reservation.statusName,
        count: 0,
        totalValue: 0,
      };
      current.count += 1;
      current.totalValue += reservation.totalPrice;
      byStatus.set(reservation.statusId, current);

      if (reservation.statusName === 'cancelled') {
        cancelledBookings += 1;
      }

      const trendKey = this.formatMonthKey(reservation.createdAt);
      const trend = trends.get(trendKey) || { count: 0, revenue: 0 };
      trend.count += 1;
      trend.revenue += reservation.totalPrice;
      trends.set(trendKey, trend);

      if (reservation.earliestCheckIn) {
        leadTimeTotal += this.diffInDays(
          reservation.createdAt,
          new Date(reservation.earliestCheckIn),
        );
        leadTimeCount += 1;
      }
    }

    return {
      summary: {
        totalBookings: reservations.length,
        cancelledBookings,
        cancellationRate:
          reservations.length > 0
            ? ((cancelledBookings / reservations.length) * 100).toFixed(2)
            : '0.00',
        averageLeadTime: leadTimeCount > 0 ? leadTimeTotal / leadTimeCount : 0,
      },
      byStatus: Array.from(byStatus.values()).map((item) => ({
        ...item,
        totalValue: item.totalValue.toFixed(2),
      })),
      trends: Array.from(trends.entries())
        .map(([period, value]) => ({
          period,
          count: value.count,
          revenue: value.revenue.toFixed(2),
        }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    };
  }

  async getOccupancyReport(query: DateRangeDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const rooms = await this.db
      .select({
        roomId: schema.rooms.id,
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        roomTypeId: schema.roomTypes.id,
        roomTypeName: schema.roomTypes.name,
        quantity: schema.rooms.quantity,
      })
      .from(schema.rooms)
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .where(
        and(
          isNull(schema.rooms.deletedAt),
          query.propertyId
            ? eq(schema.rooms.propertyId, query.propertyId)
            : undefined,
        ),
      );

    const activeStatuses = [
      'confirmed',
      'in progress',
      'checked out',
      'completed',
    ];
    const reservationRows = await this.db
      .select({
        reservationRoomId: schema.reservationRooms.id,
        roomId: schema.rooms.id,
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        roomTypeId: schema.roomTypes.id,
        roomTypeName: schema.roomTypes.name,
        checkIn: schema.reservationRooms.checkIn,
        checkOut: schema.reservationRooms.checkOut,
        statusName: schema.reservationStatus.name,
      })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .innerJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .leftJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(
        and(
          isNull(schema.reservationRooms.deletedAt),
          isNull(schema.reservations.deletedAt),
          query.propertyId
            ? eq(schema.rooms.propertyId, query.propertyId)
            : undefined,
          lte(schema.reservationRooms.checkIn, this.toDateOnly(endDate)),
          gte(schema.reservationRooms.checkOut, this.toDateOnly(startDate)),
        ),
      );

    const totalDays = Math.max(1, this.diffInDays(endDate, startDate) + 1);
    const propertyAvailability = new Map<
      string,
      {
        propertyId: string;
        propertyName: string;
        totalBookedNights: number;
        totalAvailableNights: number;
        roomCount: number;
      }
    >();
    const roomTypeAvailability = new Map<
      string,
      {
        roomTypeId: string;
        roomTypeName: string;
        totalBookedNights: number;
        totalAvailableNights: number;
        roomCount: number;
      }
    >();

    for (const room of rooms) {
      if (room.propertyId) {
        const current = propertyAvailability.get(room.propertyId) || {
          propertyId: room.propertyId,
          propertyName: room.propertyName || 'N/A',
          totalBookedNights: 0,
          totalAvailableNights: 0,
          roomCount: 0,
        };
        current.roomCount += room.quantity || 1;
        current.totalAvailableNights += (room.quantity || 1) * totalDays;
        propertyAvailability.set(room.propertyId, current);
      }

      if (room.roomTypeId) {
        const current = roomTypeAvailability.get(room.roomTypeId) || {
          roomTypeId: room.roomTypeId,
          roomTypeName: room.roomTypeName || 'N/A',
          totalBookedNights: 0,
          totalAvailableNights: 0,
          roomCount: 0,
        };
        current.roomCount += room.quantity || 1;
        current.totalAvailableNights += (room.quantity || 1) * totalDays;
        roomTypeAvailability.set(room.roomTypeId, current);
      }
    }

    for (const row of reservationRows) {
      const statusName = this.normalizeStatus(row.statusName);
      if (!activeStatuses.includes(statusName)) continue;

      const bookedNights = this.calculateOverlapNights(
        new Date(row.checkIn),
        new Date(row.checkOut),
        startDate,
        endDate,
      );

      if (bookedNights <= 0) continue;

      if (row.propertyId) {
        const current = propertyAvailability.get(row.propertyId);
        if (current) current.totalBookedNights += bookedNights;
      }

      if (row.roomTypeId) {
        const current = roomTypeAvailability.get(row.roomTypeId);
        if (current) current.totalBookedNights += bookedNights;
      }
    }

    const completedOrCheckedOut = reservationRows.filter((row) => {
      const statusName = this.normalizeStatus(row.statusName);
      return ['checked out', 'completed'].includes(statusName);
    });
    const averageLengthOfStay =
      completedOrCheckedOut.length > 0
        ? completedOrCheckedOut.reduce(
            (sum, row) =>
              sum +
              this.diffInDays(new Date(row.checkOut), new Date(row.checkIn)),
            0,
          ) / completedOrCheckedOut.length
        : 0;

    return {
      dateRange: {
        startDate: this.toDateOnly(startDate),
        endDate: this.toDateOnly(endDate),
        totalDays,
      },
      summary: {
        averageLengthOfStay,
        totalRooms: rooms.reduce((sum, room) => sum + (room.quantity || 1), 0),
      },
      byRoom: [],
      byProperty: Array.from(propertyAvailability.values()).map((item) => ({
        ...item,
        occupancyRate:
          item.totalAvailableNights > 0
            ? (
                (item.totalBookedNights / item.totalAvailableNights) *
                100
              ).toFixed(2)
            : '0.00',
      })),
      byRoomType: Array.from(roomTypeAvailability.values()).map((item) => ({
        ...item,
        occupancyRate:
          item.totalAvailableNights > 0
            ? (
                (item.totalBookedNights / item.totalAvailableNights) *
                100
              ).toFixed(2)
            : '0.00',
      })),
    };
  }

  async getCustomersReport(query: DateRangeDto) {
    const rows = await this.db
      .select({
        reservationId: schema.reservations.id,
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        country: schema.addresses.country,
        createdAt: schema.reservations.createdAt,
        invoiceAmount: schema.invoices.totalAmount,
      })
      .from(schema.reservations)
      .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .leftJoin(
        schema.addresses,
        eq(schema.users.addressId, schema.addresses.id),
      )
      .leftJoin(
        schema.invoices,
        eq(schema.reservations.id, schema.invoices.reservationId),
      )
      .where(this.buildReservationDateConditions(query));

    const customerMap = new Map<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        country: string;
        bookingCount: number;
        totalRevenue: number;
        firstSeenAt: Date;
      }
    >();
    const acquisition = new Map<string, Set<string>>();

    for (const row of rows) {
      const current = customerMap.get(row.userId) || {
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        country: row.country || 'N/A',
        bookingCount: 0,
        totalRevenue: 0,
        firstSeenAt: row.createdAt,
      };
      current.bookingCount += 1;
      current.totalRevenue += this.toNumber(row.invoiceAmount);
      if (row.createdAt < current.firstSeenAt) {
        current.firstSeenAt = row.createdAt;
      }
      customerMap.set(row.userId, current);
    }

    for (const customer of customerMap.values()) {
      const monthKey = this.formatMonthKey(customer.firstSeenAt);
      const customers = acquisition.get(monthKey) || new Set<string>();
      customers.add(customer.userId);
      acquisition.set(monthKey, customers);
    }

    const segmentation = [
      {
        segment: '1 reserva',
        customerCount: Array.from(customerMap.values()).filter(
          (customer) => customer.bookingCount === 1,
        ).length,
      },
      {
        segment: '2-3 reservas',
        customerCount: Array.from(customerMap.values()).filter(
          (customer) =>
            customer.bookingCount >= 2 && customer.bookingCount <= 3,
        ).length,
      },
      {
        segment: '4+ reservas',
        customerCount: Array.from(customerMap.values()).filter(
          (customer) => customer.bookingCount >= 4,
        ).length,
      },
    ];

    const demographics = new Map<string, number>();
    for (const customer of customerMap.values()) {
      demographics.set(
        customer.country,
        (demographics.get(customer.country) || 0) + 1,
      );
    }

    return {
      summary: {
        totalCustomers: customerMap.size,
        averageBookingsPerCustomer:
          customerMap.size > 0 ? rows.length / customerMap.size : 0,
      },
      acquisition: Array.from(acquisition.entries())
        .map(([month, customers]) => ({
          month,
          newCustomers: customers.size,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      topCustomers: Array.from(customerMap.values())
        .map((customer) => ({
          userId: customer.userId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          totalRevenue: customer.totalRevenue.toFixed(2),
          bookingCount: customer.bookingCount,
          averageBookingValue:
            customer.bookingCount > 0
              ? customer.totalRevenue / customer.bookingCount
              : 0,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        }))
        .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
        .slice(0, 10),
      segmentation,
      demographics: {
        byCountry: Array.from(demographics.entries())
          .map(([country, customerCount]) => ({ country, customerCount }))
          .sort((a, b) => b.customerCount - a.customerCount),
      },
    };
  }

  async getDailyOperationsReport(query: DailyOperationsDto) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const today = this.toDateOnly(targetDate);
    const tomorrowDate = new Date(targetDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = this.toDateOnly(tomorrowDate);

    const rows = await getReservationDetails(this.db, [
      isNull(schema.reservationRooms.deletedAt),
      query.propertyId ? eq(schema.properties.id, query.propertyId) : undefined,
    ]);

    const withDates = rows.map((row) => ({
      ...row,
      statusName: this.normalizeStatus(row.statusName),
    }));

    const todayCheckIns = withDates.filter(
      (row) => row.checkIn === today && row.statusName !== 'cancelled',
    );
    const todayCheckOuts = withDates.filter(
      (row) =>
        row.checkOut === today &&
        !['cancelled', 'checked out', 'completed'].includes(row.statusName),
    );
    const tomorrowCheckIns = withDates.filter(
      (row) => row.checkIn === tomorrow && row.statusName !== 'cancelled',
    );
    const inProgress = withDates.filter(
      (row) => row.statusName === 'in progress',
    );
    const overdueCheckOuts = withDates.filter(
      (row) =>
        row.checkOut < today &&
        !['cancelled', 'checked out', 'completed'].includes(row.statusName),
    );

    return {
      date: today,
      summary: {
        todayCheckInsCount: todayCheckIns.length,
        todayCheckOutsCount: todayCheckOuts.length,
        tomorrowCheckInsCount: tomorrowCheckIns.length,
        inProgressCount: inProgress.length,
        overdueCheckOutsCount: overdueCheckOuts.length,
      },
      todayCheckIns,
      todayCheckOuts,
      tomorrowCheckIns,
      inProgress,
      overdueCheckOuts,
    };
  }

  async getMonthlyReservationsReport(query: MonthlyReservationsDto) {
    const rows = await this.db
      .select({
        reservationId: schema.reservations.id,
        checkIn: schema.reservationRooms.checkIn,
        checkOut: schema.reservationRooms.checkOut,
        guestsCount: schema.reservationRooms.guestsCount,
        roomId: schema.rooms.id,
        roomName: schema.rooms.name,
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        userId: schema.users.id,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userEmail: schema.users.email,
        statusId: schema.reservations.statusId,
        statusName: schema.reservationStatus.name,
        totalPrice: schema.reservations.totalPrice,
        createdAt: schema.reservations.createdAt,
      })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .innerJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .leftJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(
        and(
          isNull(schema.reservationRooms.deletedAt),
          isNull(schema.reservations.deletedAt),
          this.buildCreatedAtRangeCondition(
            schema.reservations.createdAt,
            query.startDate,
            query.endDate,
          ),
          query.propertyId
            ? eq(schema.rooms.propertyId, query.propertyId)
            : undefined,
          query.statusId
            ? eq(schema.reservations.statusId, query.statusId)
            : undefined,
        ),
      )
      .orderBy(desc(schema.reservations.createdAt));

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      ...createPaginatedResponse(paginated, rows.length, page, limit),
      dateRange: {
        startDate: query.startDate || this.toDateOnly(new Date()),
        endDate: query.endDate || this.toDateOnly(new Date()),
      },
    };
  }

  async getFinancialSummaryReport(query: FinancialSummaryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    const rows = await this.db
      .select({
        invoiceId: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        totalAmount: schema.invoices.totalAmount,
        dueDate: schema.invoices.dueDate,
        reservationId: schema.invoices.reservationId,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userEmail: schema.users.email,
        createdAt: schema.invoices.createdAt,
        statusName: schema.invoiceStatus.name,
      })
      .from(schema.invoices)
      .innerJoin(schema.users, eq(schema.invoices.userId, schema.users.id))
      .leftJoin(
        schema.invoiceStatus,
        eq(schema.invoices.statusId, schema.invoiceStatus.id),
      )
      .where(this.buildInvoiceConditions(query, startDate, endDate));

    const pendingInvoices = rows.filter(
      (row) => this.normalizeStatus(row.statusName) === 'pending',
    );
    const paidInvoices = rows.filter(
      (row) => this.normalizeStatus(row.statusName) === 'paid',
    );
    const overdueInvoices = pendingInvoices.filter(
      (row) => row.dueDate && new Date(row.dueDate) < new Date(),
    );

    return {
      dateRange: {
        startDate: this.toDateOnly(startDate),
        endDate: this.toDateOnly(endDate),
      },
      summary: {
        totalCollected: paidInvoices
          .reduce((sum, row) => sum + this.toNumber(row.totalAmount), 0)
          .toFixed(2),
        paidInvoicesCount: paidInvoices.length,
        totalOutstanding: pendingInvoices
          .reduce((sum, row) => sum + this.toNumber(row.totalAmount), 0)
          .toFixed(2),
        pendingInvoicesCount: pendingInvoices.length,
        overdueInvoicesCount: overdueInvoices.length,
        overdueAmount: overdueInvoices
          .reduce((sum, row) => sum + this.toNumber(row.totalAmount), 0)
          .toFixed(2),
      },
      pendingInvoices: pendingInvoices.map((row) => ({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber || row.invoiceId,
        totalAmount: row.totalAmount,
        dueDate: row.dueDate?.toISOString() || '',
        reservationId: row.reservationId,
        userFirstName: row.userFirstName,
        userLastName: row.userLastName,
        userEmail: row.userEmail,
        createdAt: row.createdAt.toISOString(),
      })),
      overdueInvoices: overdueInvoices.map((row) => ({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber || row.invoiceId,
        totalAmount: row.totalAmount,
        dueDate: row.dueDate?.toISOString() || '',
        reservationId: row.reservationId,
        userFirstName: row.userFirstName,
        userLastName: row.userLastName,
        userEmail: row.userEmail,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async getOccurrencesReport(query: OccurrencesReportDto) {
    const startDate = query.startDate
      ? this.startOfDay(new Date(query.startDate))
      : undefined;
    const endDate = query.endDate
      ? this.endOfDay(new Date(query.endDate))
      : undefined;
    const rows = await this.db
      .select({
        id: schema.occurrences.id,
        description: schema.occurrences.description,
        statusId: schema.occurrences.statusId,
        statusName: schema.occurrenceStatus.name,
        reservationId: schema.occurrences.reservationId,
        createdAt: schema.occurrences.createdAt,
        updatedAt: schema.occurrences.updatedAt,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        userEmail: schema.users.email,
      })
      .from(schema.occurrences)
      .leftJoin(
        schema.occurrenceStatus,
        eq(schema.occurrences.statusId, schema.occurrenceStatus.id),
      )
      .leftJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .leftJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .where(
        and(
          isNull(schema.occurrences.deletedAt),
          query.statusId
            ? eq(schema.occurrences.statusId, query.statusId)
            : undefined,
          startDate ? gte(schema.occurrences.createdAt, startDate) : undefined,
          endDate ? lte(schema.occurrences.createdAt, endDate) : undefined,
        ),
      )
      .orderBy(desc(schema.occurrences.createdAt));

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);
    const groupedByStatus = this.groupBy(rows, (row) => row.statusId);

    return {
      ...createPaginatedResponse(
        paginated.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt:
            row.updatedAt?.toISOString() || row.createdAt.toISOString(),
        })),
        rows.length,
        page,
        limit,
      ),
      summary: {
        total: rows.length,
        byStatus: Array.from(groupedByStatus.values()).map((items) => ({
          statusId: items[0].statusId,
          statusName: items[0].statusName || 'Unknown',
          count: items.length,
        })),
      },
    };
  }

  private async getRevenueAllocationRows(
    query: DateRangeDto,
  ): Promise<RevenueAllocationRow[]> {
    const { startDate, endDate } = this.resolveDateRange(query);
    return this.db
      .select({
        invoiceId: schema.invoices.id,
        reservationId: schema.reservations.id,
        totalAmount: schema.invoices.totalAmount,
        invoiceStatusName: schema.invoiceStatus.name,
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        roomTypeId: schema.roomTypes.id,
        roomTypeName: schema.roomTypes.name,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.reservations,
        eq(schema.invoices.reservationId, schema.reservations.id),
      )
      .innerJoin(
        schema.reservationRooms,
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .innerJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .leftJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .leftJoin(
        schema.invoiceStatus,
        eq(schema.invoices.statusId, schema.invoiceStatus.id),
      )
      .where(
        and(
          isNull(schema.invoices.deletedAt),
          isNull(schema.reservationRooms.deletedAt),
          isNull(schema.reservations.deletedAt),
          gte(schema.invoices.createdAt, startDate),
          lte(schema.invoices.createdAt, endDate),
          query.propertyId
            ? eq(schema.rooms.propertyId, query.propertyId)
            : undefined,
        ),
      );
  }

  private async getReservationRows(query: DateRangeDto) {
    return this.db
      .select({
        reservationId: schema.reservations.id,
        userId: schema.reservations.userId,
        createdAt: schema.reservations.createdAt,
        totalPrice: schema.reservations.totalPrice,
        statusId: schema.reservations.statusId,
        statusName: schema.reservationStatus.name,
        checkIn: schema.reservationRooms.checkIn,
        propertyId: schema.rooms.propertyId,
      })
      .from(schema.reservations)
      .leftJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .leftJoin(
        schema.reservationRooms,
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .leftJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .where(this.buildReservationDateConditions(query));
  }

  private buildReservationDateConditions(query: DateRangeDto) {
    const { startDate, endDate } = this.resolveDateRange(query);
    return and(
      isNull(schema.reservations.deletedAt),
      gte(schema.reservations.createdAt, startDate),
      lte(schema.reservations.createdAt, endDate),
      query.propertyId
        ? sql`exists (
            select 1
            from reservation_rooms rr
            inner join rooms r on r.id = rr.room_id
            where rr.reservation_id = ${schema.reservations.id}
              and rr.deleted_at is null
              and r.property_id = ${query.propertyId}
          )`
        : undefined,
    );
  }

  private buildInvoiceConditions(
    query: FinancialSummaryDto,
    startDate: Date,
    endDate: Date,
  ) {
    return and(
      isNull(schema.invoices.deletedAt),
      gte(schema.invoices.createdAt, startDate),
      lte(schema.invoices.createdAt, endDate),
      query.propertyId
        ? sql`exists (
            select 1
            from reservation_rooms rr
            inner join rooms r on r.id = rr.room_id
            where rr.reservation_id = ${schema.invoices.reservationId}
              and rr.deleted_at is null
              and r.property_id = ${query.propertyId}
          )`
        : undefined,
    );
  }

  private resolveDateRange(query?: { startDate?: string; endDate?: string }) {
    const endDate = query?.endDate
      ? this.endOfDay(new Date(query.endDate))
      : this.endOfDay(new Date());
    const startDate = query?.startDate
      ? this.startOfDay(new Date(query.startDate))
      : this.startOfDay(new Date(endDate.getFullYear(), endDate.getMonth(), 1));

    return { startDate, endDate };
  }

  private buildCreatedAtRangeCondition(
    column: any,
    startDate?: string,
    endDate?: string,
  ) {
    return and(
      startDate ? gte(column, this.startOfDay(new Date(startDate))) : undefined,
      endDate ? lte(column, this.endOfDay(new Date(endDate))) : undefined,
    );
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private endOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  private toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined) return 0;
    return typeof value === 'number' ? value : Number.parseFloat(value || '0');
  }

  private normalizeStatus(value: string | null | undefined) {
    return (value || '').trim().toLowerCase();
  }

  private formatMonthKey(date: Date) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  }

  private diffInDays(laterDate: Date, earlierDate: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(
      0,
      Math.round(
        (this.startOfDay(laterDate).getTime() -
          this.startOfDay(earlierDate).getTime()) /
          msPerDay,
      ),
    );
  }

  private calculateOverlapNights(
    checkIn: Date,
    checkOut: Date,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const start = new Date(
      Math.max(
        this.startOfDay(checkIn).getTime(),
        this.startOfDay(rangeStart).getTime(),
      ),
    );
    const end = new Date(
      Math.min(
        this.startOfDay(checkOut).getTime(),
        this.startOfDay(rangeEnd).getTime(),
      ),
    );

    if (end <= start) {
      return 0;
    }

    return this.diffInDays(end, start);
  }

  private groupBy<T>(items: T[], getKey: (item: T) => string) {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const key = getKey(item);
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    }
    return groups;
  }
}

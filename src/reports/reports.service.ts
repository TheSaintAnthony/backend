import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  DateRangeDto,
  GroupByPeriod,
  DailyOperationsDto,
  MonthlyReservationsDto,
  FinancialSummaryDto,
  OccurrencesReportDto,
} from './dto';
import {
  sql,
  and,
  gte,
  lte,
  eq,
  count,
  sum,
  desc,
  asc,
  isNull,
} from 'drizzle-orm';
@Injectable()
export class ReportsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}
  async getRevenueOverview(filters: DateRangeDto) {
    const { startDate, endDate, propertyId } = filters;
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(
        gte(schema.reservations.createdAt, new Date(startDate)),
      );
    }
    if (endDate) {
      dateConditions.push(
        lte(schema.reservations.createdAt, new Date(endDate)),
      );
    }
    const [confirmedStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'Confirmed'));
    const [completedStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'Checked Out'));
    const validStatusIds = [confirmedStatus?.id, completedStatus?.id].filter(
      Boolean,
    );
    const revenueConditions = [
      ...dateConditions,
      validStatusIds.length > 0
        ? sql`${schema.reservations.statusId} IN (${sql.join(
            validStatusIds.map((id) => sql`${id}`),
            sql`, `,
          )})`
        : undefined,
    ].filter(Boolean);
    const totalRevenueResult = await this.db
      .select({
        totalRevenue: sum(schema.reservations.totalPrice),
        totalBookings: count(schema.reservations.id),
        averageBookingValue: sql<number>`AVG(${schema.reservations.totalPrice})`,
      })
      .from(schema.reservations)
      .where(
        revenueConditions.length > 0 ? and(...revenueConditions) : undefined,
      );
    const totalRevenue = totalRevenueResult[0];
    const revenueByProperty = await this.db
      .select({
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        revenue: sum(schema.reservations.totalPrice),
        bookingCount: count(schema.reservations.id),
      })
      .from(schema.reservations)
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
          ...revenueConditions,
          propertyId ? eq(schema.properties.id, propertyId) : undefined,
        ),
      )
      .groupBy(schema.properties.id, schema.properties.name);
    const revenueByRoomType = await this.db
      .select({
        roomTypeId: schema.roomTypes.id,
        roomTypeName: schema.roomTypes.name,
        revenue: sum(schema.reservations.totalPrice),
        bookingCount: count(schema.reservations.id),
      })
      .from(schema.reservations)
      .innerJoin(
        schema.reservationRooms,
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .innerJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .innerJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .where(and(...revenueConditions))
      .groupBy(schema.roomTypes.id, schema.roomTypes.name);
    const revenueByPaymentMethod: any[] = [];
    const [pendingInvoiceStatus] = await this.db
      .select()
      .from(schema.invoiceStatus)
      .where(eq(schema.invoiceStatus.name, 'Pending'));
    const outstandingResult = await this.db
      .select({
        outstandingAmount: sum(schema.invoices.totalAmount),
        outstandingCount: count(schema.invoices.id),
      })
      .from(schema.invoices)
      .where(
        pendingInvoiceStatus
          ? eq(schema.invoices.statusId, pendingInvoiceStatus.id)
          : undefined,
      );
    return {
      overview: {
        totalRevenue: totalRevenue.totalRevenue || '0',
        totalBookings: totalRevenue.totalBookings || 0,
        averageBookingValue: totalRevenue.averageBookingValue || 0,
        outstandingAmount: outstandingResult[0]?.outstandingAmount || '0',
        outstandingInvoices: outstandingResult[0]?.outstandingCount || 0,
      },
      byProperty: revenueByProperty,
      byRoomType: revenueByRoomType,
      byPaymentMethod: revenueByPaymentMethod,
    };
  }
  async getBookingTrends(filters: DateRangeDto) {
    const { startDate, endDate, groupBy = 'day' } = filters;
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(
        gte(schema.reservations.createdAt, new Date(startDate)),
      );
    }
    if (endDate) {
      dateConditions.push(
        lte(schema.reservations.createdAt, new Date(endDate)),
      );
    }
    const bookingsByStatus = await this.db
      .select({
        statusId: schema.reservationStatus.id,
        statusName: schema.reservationStatus.name,
        count: count(schema.reservations.id),
        totalValue: sum(schema.reservations.totalPrice),
      })
      .from(schema.reservations)
      .innerJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .groupBy(schema.reservationStatus.id, schema.reservationStatus.name);
    let dateGroupExpression;
    switch (groupBy) {
      case GroupByPeriod.DAY:
        dateGroupExpression = sql<string>`DATE(${schema.reservations.createdAt})`;
        break;
      case GroupByPeriod.WEEK:
        dateGroupExpression = sql<string>`DATE_TRUNC('week', ${schema.reservations.createdAt})`;
        break;
      case GroupByPeriod.MONTH:
        dateGroupExpression = sql<string>`DATE_TRUNC('month', ${schema.reservations.createdAt})`;
        break;
      case GroupByPeriod.YEAR:
        dateGroupExpression = sql<string>`DATE_TRUNC('year', ${schema.reservations.createdAt})`;
        break;
      default:
        dateGroupExpression = sql<string>`DATE(${schema.reservations.createdAt})`;
    }
    const bookingsOverTime = await this.db
      .select({
        period: dateGroupExpression,
        count: count(schema.reservations.id),
        revenue: sum(schema.reservations.totalPrice),
      })
      .from(schema.reservations)
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .groupBy(dateGroupExpression)
      .orderBy(dateGroupExpression);
    const [cancelledStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'Cancelled'));
    const totalBookings = bookingsByStatus.reduce(
      (acc, curr) => acc + curr.count,
      0,
    );
    const cancelledBookings =
      bookingsByStatus.find((s) => s.statusId === cancelledStatus?.id)?.count ||
      0;
    const cancellationRate =
      totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    const leadTimeResult = await this.db
      .select({
        averageLeadTime: sql<number>`AVG(EXTRACT(DAY FROM (${schema.reservationRooms.checkIn}::timestamp - ${schema.reservations.createdAt}::timestamp)))`,
      })
      .from(schema.reservations)
      .innerJoin(
        schema.reservationRooms,
        eq(schema.reservations.id, schema.reservationRooms.reservationId),
      )
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);
    return {
      summary: {
        totalBookings,
        cancelledBookings,
        cancellationRate: cancellationRate.toFixed(2),
        averageLeadTime: leadTimeResult[0]?.averageLeadTime || 0,
      },
      byStatus: bookingsByStatus,
      trends: bookingsOverTime,
    };
  }
  async getOccupancyAnalytics(filters: DateRangeDto) {
    const { startDate, endDate, propertyId } = filters;
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const roomsQuery = this.db
      .select({
        id: schema.rooms.id,
        name: schema.rooms.name,
        propertyId: schema.properties.id,
        propertyName: schema.properties.name,
        roomTypeId: schema.roomTypes.id,
        roomTypeName: schema.roomTypes.name,
      })
      .from(schema.rooms)
      .innerJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.roomTypeId, schema.roomTypes.id),
      )
      .where(propertyId ? eq(schema.properties.id, propertyId) : undefined);
    const rooms = await roomsQuery;
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    const bookedNights = await this.db
      .select({
        roomId: schema.reservationRooms.roomId,
        totalNights: sql<number>`COALESCE(SUM((${schema.reservationRooms.checkOut} - ${schema.reservationRooms.checkIn})), 0)`,
      })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .where(
        and(
          gte(schema.reservationRooms.checkIn, startDateStr),
          lte(schema.reservationRooms.checkOut, endDateStr),
          sql`${schema.reservations.statusId} IN (SELECT id FROM ${schema.reservationStatus} WHERE name IN ('Confirmed', 'In Progress', 'Checked Out'))`,
        ),
      )
      .groupBy(schema.reservationRooms.roomId);
    const bookedNightsMap = new Map(
      bookedNights.map((b) => [b.roomId, b.totalNights || 0]),
    );
    const roomOccupancy = rooms.map((room) => {
      const nights = bookedNightsMap.get(room.id) || 0;
      const availableNights = daysDiff;
      const occupancyRate =
        availableNights > 0 ? (nights / availableNights) * 100 : 0;
      return {
        roomId: room.id,
        roomName: room.name,
        propertyId: room.propertyId,
        propertyName: room.propertyName,
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        bookedNights: nights,
        availableNights,
        occupancyRate: occupancyRate.toFixed(2),
      };
    });
    const propertyOccupancy = rooms.reduce(
      (acc, room) => {
        const nights = bookedNightsMap.get(room.id) || 0;
        const key = room.propertyId;
        if (!acc[key]) {
          acc[key] = {
            propertyId: room.propertyId,
            propertyName: room.propertyName,
            totalBookedNights: 0,
            totalAvailableNights: 0,
            roomCount: 0,
          };
        }
        acc[key].totalBookedNights += nights;
        acc[key].totalAvailableNights += daysDiff;
        acc[key].roomCount += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          propertyId: string;
          propertyName: string | null;
          totalBookedNights: number;
          totalAvailableNights: number;
          roomCount: number;
        }
      >,
    );
    const propertyOccupancyArray = Object.values(propertyOccupancy).map(
      (prop) => ({
        ...prop,
        occupancyRate:
          prop.totalAvailableNights > 0
            ? (
                (prop.totalBookedNights / prop.totalAvailableNights) *
                100
              ).toFixed(2)
            : '0.00',
      }),
    );
    const roomTypeOccupancy = rooms.reduce(
      (acc, room) => {
        if (!room.roomTypeId) return acc;
        const nights = bookedNightsMap.get(room.id) || 0;
        const key = room.roomTypeId;
        if (!acc[key]) {
          acc[key] = {
            roomTypeId: room.roomTypeId,
            roomTypeName: room.roomTypeName,
            totalBookedNights: 0,
            totalAvailableNights: 0,
            roomCount: 0,
          };
        }
        acc[key].totalBookedNights += nights;
        acc[key].totalAvailableNights += daysDiff;
        acc[key].roomCount += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          roomTypeId: string;
          roomTypeName: string | null;
          totalBookedNights: number;
          totalAvailableNights: number;
          roomCount: number;
        }
      >,
    );
    const roomTypeOccupancyArray = Object.values(roomTypeOccupancy).map(
      (type) => ({
        ...type,
        occupancyRate:
          type.totalAvailableNights > 0
            ? (
                (type.totalBookedNights / type.totalAvailableNights) *
                100
              ).toFixed(2)
            : '0.00',
      }),
    );
    const avgLengthOfStay = await this.db
      .select({
        averageNights: sql<number>`COALESCE(AVG((${schema.reservationRooms.checkOut} - ${schema.reservationRooms.checkIn})), 0)`,
      })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .where(
        and(
          gte(schema.reservationRooms.checkIn, startDateStr),
          lte(schema.reservationRooms.checkOut, endDateStr),
        ),
      );
    return {
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalDays: daysDiff,
      },
      summary: {
        averageLengthOfStay: avgLengthOfStay[0]?.averageNights || 0,
        totalRooms: rooms.length,
      },
      byRoom: roomOccupancy,
      byProperty: propertyOccupancyArray,
      byRoomType: roomTypeOccupancyArray,
    };
  }
  async getCustomerInsights(filters: DateRangeDto) {
    const { startDate, endDate } = filters;
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(schema.users.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateConditions.push(lte(schema.users.createdAt, new Date(endDate)));
    }
    const [totalCustomersResult] = await this.db
      .select({
        totalCustomers: count(schema.users.id),
      })
      .from(schema.users)
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);
    const customerAcquisition = await this.db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${schema.users.createdAt})`,
        newCustomers: count(schema.users.id),
      })
      .from(schema.users)
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
      .groupBy(sql`DATE_TRUNC('month', ${schema.users.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${schema.users.createdAt})`);
    const topCustomers = await this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        totalRevenue: sum(schema.reservations.totalPrice),
        bookingCount: count(schema.reservations.id),
        averageBookingValue: sql<number>`AVG(${schema.reservations.totalPrice})`,
      })
      .from(schema.users)
      .leftJoin(
        schema.reservations,
        eq(schema.users.id, schema.reservations.userId),
      )
      .groupBy(
        schema.users.id,
        schema.users.firstName,
        schema.users.lastName,
        schema.users.email,
      )
      .orderBy(desc(sum(schema.reservations.totalPrice)))
      .limit(20);
    const allCustomersWithBookings = await this.db
      .select({
        userId: schema.users.id,
        bookingCount: count(schema.reservations.id),
      })
      .from(schema.users)
      .leftJoin(
        schema.reservations,
        eq(schema.users.id, schema.reservations.userId),
      )
      .groupBy(schema.users.id);
    const customersWithNoBookings = allCustomersWithBookings.filter(
      (c) => c.bookingCount === 0,
    ).length;
    const customersWithOneBooking = allCustomersWithBookings.filter(
      (c) => c.bookingCount === 1,
    ).length;
    const returningCustomers = allCustomersWithBookings.filter(
      (c) => c.bookingCount > 1,
    ).length;
    const customerBookingCounts = [
      {
        segment: 'No Bookings',
        customerCount: customersWithNoBookings,
      },
      {
        segment: 'One Booking',
        customerCount: customersWithOneBooking,
      },
      {
        segment: 'Returning (2+)',
        customerCount: returningCustomers,
      },
    ];
    const customersByCountry = await this.db
      .select({
        country: schema.addresses.country,
        customerCount: count(sql`DISTINCT ${schema.users.id}`),
      })
      .from(schema.users)
      .leftJoin(
        schema.addresses,
        eq(schema.users.addressId, schema.addresses.id),
      )
      .where(sql`${schema.addresses.country} IS NOT NULL`)
      .groupBy(schema.addresses.country)
      .orderBy(desc(count(sql`DISTINCT ${schema.users.id}`)))
      .limit(10);
    const totalBookingsCount = allCustomersWithBookings.reduce(
      (sum, c) => sum + c.bookingCount,
      0,
    );
    const averageBookingsPerCustomer =
      allCustomersWithBookings.length > 0
        ? totalBookingsCount / allCustomersWithBookings.length
        : 0;
    return {
      summary: {
        totalCustomers: totalCustomersResult.totalCustomers || 0,
        averageBookingsPerCustomer: Number(
          averageBookingsPerCustomer.toFixed(2),
        ),
      },
      acquisition: customerAcquisition,
      topCustomers: topCustomers.map((c) => ({
        ...c,
        customerName: `${c.firstName} ${c.lastName}`,
      })),
      segmentation: customerBookingCounts,
      demographics: {
        byCountry: customersByCountry,
      },
    };
  }
  async getAllReports(filters: DateRangeDto) {
    const [revenue, bookings, occupancy, customers] = await Promise.all([
      this.getRevenueOverview(filters),
      this.getBookingTrends(filters),
      this.getOccupancyAnalytics(filters),
      this.getCustomerInsights(filters),
    ]);
    return {
      revenue,
      bookings,
      occupancy,
      customers,
    };
  }

  async getDailyOperations(filters: DailyOperationsDto) {
    const targetDate = filters.date || new Date().toISOString().split('T')[0];
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get status IDs
    const [confirmedStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'Confirmed'));

    const [checkedInStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'In Progress'));

    const [completedStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'Checked Out'));

    // Base query for reservation details
    const getReservationDetails = async (conditions: any[]) => {
      return this.db
        .select({
          reservationId: schema.reservations.id,
          checkIn: schema.reservationRooms.checkIn,
          checkOut: schema.reservationRooms.checkOut,
          guestsCount: schema.reservationRooms.guestsCount,
          accessCode: schema.reservationRooms.accessCode,
          roomId: schema.rooms.id,
          roomName: schema.rooms.name,
          propertyId: schema.properties.id,
          propertyName: schema.properties.name,
          userId: schema.users.id,
          userFirstName: schema.users.firstName,
          userLastName: schema.users.lastName,
          userEmail: schema.users.email,
          userPhone: schema.users.phone,
          statusId: schema.reservations.statusId,
          statusName: schema.reservationStatus.name,
          totalPrice: schema.reservations.totalPrice,
          specialRequests: schema.reservations.specialRequests,
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
        .innerJoin(
          schema.properties,
          eq(schema.rooms.propertyId, schema.properties.id),
        )
        .innerJoin(
          schema.users,
          eq(schema.reservations.userId, schema.users.id),
        )
        .innerJoin(
          schema.reservationStatus,
          eq(schema.reservations.statusId, schema.reservationStatus.id),
        )
        .where(and(...conditions, isNull(schema.reservations.deletedAt)));
    };

    // Today's Check-ins (confirmed reservations with check-in today)
    const todayCheckIns = confirmedStatus
      ? await getReservationDetails([
          eq(schema.reservationRooms.checkIn, targetDate),
          eq(schema.reservations.statusId, confirmedStatus.id),
          ...(filters.propertyId
            ? [eq(schema.properties.id, filters.propertyId)]
            : []),
        ])
      : [];

    // Today's Check-outs (checked-in reservations with check-out today)
    const todayCheckOuts = checkedInStatus
      ? await getReservationDetails([
          eq(schema.reservationRooms.checkOut, targetDate),
          eq(schema.reservations.statusId, checkedInStatus.id),
          ...(filters.propertyId
            ? [eq(schema.properties.id, filters.propertyId)]
            : []),
        ])
      : [];

    // Tomorrow's Check-ins
    const tomorrowCheckIns = confirmedStatus
      ? await getReservationDetails([
          eq(schema.reservationRooms.checkIn, tomorrowStr),
          eq(schema.reservations.statusId, confirmedStatus.id),
          ...(filters.propertyId
            ? [eq(schema.properties.id, filters.propertyId)]
            : []),
        ])
      : [];

    // In Progress (currently checked-in guests)
    const inProgress = checkedInStatus
      ? await getReservationDetails([
          eq(schema.reservations.statusId, checkedInStatus.id),
          ...(filters.propertyId
            ? [eq(schema.properties.id, filters.propertyId)]
            : []),
        ])
      : [];

    // Overdue Check-outs (checked-in with check-out date in the past)
    const overdueCheckOuts = checkedInStatus
      ? await getReservationDetails([
          lte(schema.reservationRooms.checkOut, targetDate),
          eq(schema.reservations.statusId, checkedInStatus.id),
          ...(filters.propertyId
            ? [eq(schema.properties.id, filters.propertyId)]
            : []),
        ])
      : [];

    return {
      date: targetDate,
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

  async getMonthlyReservations(filters: MonthlyReservationsDto) {
    const now = new Date();
    const startDate =
      filters.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const endDate =
      filters.endDate ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [
      gte(schema.reservationRooms.checkIn, startDate),
      lte(schema.reservationRooms.checkIn, endDate),
      isNull(schema.reservations.deletedAt),
    ];

    if (filters.propertyId) {
      conditions.push(eq(schema.properties.id, filters.propertyId));
    }

    if (filters.statusId) {
      conditions.push(eq(schema.reservations.statusId, filters.statusId));
    }

    // Get total count
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.reservationRooms)
      .innerJoin(
        schema.reservations,
        eq(schema.reservationRooms.reservationId, schema.reservations.id),
      )
      .innerJoin(
        schema.rooms,
        eq(schema.reservationRooms.roomId, schema.rooms.id),
      )
      .innerJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .where(and(...conditions));

    // Get paginated data
    const reservations = await this.db
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
      .innerJoin(
        schema.properties,
        eq(schema.rooms.propertyId, schema.properties.id),
      )
      .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .innerJoin(
        schema.reservationStatus,
        eq(schema.reservations.statusId, schema.reservationStatus.id),
      )
      .where(and(...conditions))
      .orderBy(asc(schema.reservationRooms.checkIn))
      .limit(limit)
      .offset(offset);

    return {
      data: reservations,
      meta: {
        total: totalResult.count,
        page,
        limit,
        totalPages: Math.ceil(totalResult.count / limit),
      },
      dateRange: { startDate, endDate },
    };
  }

  async getFinancialSummary(filters: FinancialSummaryDto) {
    const now = new Date();
    const startDate =
      filters.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const endDate =
      filters.endDate ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    // Get status IDs
    const [pendingInvoiceStatus] = await this.db
      .select()
      .from(schema.invoiceStatus)
      .where(eq(schema.invoiceStatus.name, 'Pending'));

    const [paidInvoiceStatus] = await this.db
      .select()
      .from(schema.invoiceStatus)
      .where(eq(schema.invoiceStatus.name, 'Paid'));

    // Pending invoices
    const pendingInvoices = pendingInvoiceStatus
      ? await this.db
          .select({
            invoiceId: schema.invoices.id,
            invoiceNumber: schema.invoices.invoiceNumber,
            totalAmount: schema.invoices.totalAmount,
            dueDate: schema.invoices.dueDate,
            reservationId: schema.reservations.id,
            userFirstName: schema.users.firstName,
            userLastName: schema.users.lastName,
            userEmail: schema.users.email,
            createdAt: schema.invoices.createdAt,
          })
          .from(schema.invoices)
          .innerJoin(
            schema.reservations,
            eq(schema.invoices.reservationId, schema.reservations.id),
          )
          .innerJoin(
            schema.users,
            eq(schema.reservations.userId, schema.users.id),
          )
          .where(
            and(
              eq(schema.invoices.statusId, pendingInvoiceStatus.id),
              isNull(schema.invoices.deletedAt),
            ),
          )
          .orderBy(asc(schema.invoices.dueDate))
      : [];

    // Calculate overdue invoices (due date in the past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueInvoices = pendingInvoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < today,
    );

    // Revenue collected in date range
    const revenueResult = paidInvoiceStatus
      ? await this.db
          .select({
            totalCollected: sum(schema.invoices.totalAmount),
            invoiceCount: count(schema.invoices.id),
          })
          .from(schema.invoices)
          .where(
            and(
              eq(schema.invoices.statusId, paidInvoiceStatus.id),
              gte(schema.invoices.createdAt, new Date(startDate)),
              lte(schema.invoices.createdAt, new Date(endDate)),
            ),
          )
      : [{ totalCollected: '0', invoiceCount: 0 }];

    // Outstanding amount
    const outstandingResult = pendingInvoiceStatus
      ? await this.db
          .select({
            totalOutstanding: sum(schema.invoices.totalAmount),
            count: count(schema.invoices.id),
          })
          .from(schema.invoices)
          .where(eq(schema.invoices.statusId, pendingInvoiceStatus.id))
      : [{ totalOutstanding: '0', count: 0 }];

    return {
      dateRange: { startDate, endDate },
      summary: {
        totalCollected: revenueResult[0]?.totalCollected || '0',
        paidInvoicesCount: revenueResult[0]?.invoiceCount || 0,
        totalOutstanding: outstandingResult[0]?.totalOutstanding || '0',
        pendingInvoicesCount: outstandingResult[0]?.count || 0,
        overdueInvoicesCount: overdueInvoices.length,
        overdueAmount: overdueInvoices
          .reduce((acc, inv) => acc + parseFloat(inv.totalAmount || '0'), 0)
          .toFixed(2),
      },
      pendingInvoices,
      overdueInvoices,
    };
  }

  async getOccurrencesReport(filters: OccurrencesReportDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [isNull(schema.occurrences.deletedAt)];

    if (filters.startDate) {
      conditions.push(
        gte(schema.occurrences.createdAt, new Date(filters.startDate)),
      );
    }

    if (filters.endDate) {
      conditions.push(
        lte(schema.occurrences.createdAt, new Date(filters.endDate)),
      );
    }

    if (filters.statusId) {
      conditions.push(eq(schema.occurrences.statusId, filters.statusId));
    }

    // Get total count
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.occurrences)
      .where(and(...conditions));

    // Get paginated data
    const occurrences = await this.db
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
      .innerJoin(
        schema.reservations,
        eq(schema.occurrences.reservationId, schema.reservations.id),
      )
      .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .leftJoin(
        schema.occurrenceStatus,
        eq(schema.occurrences.statusId, schema.occurrenceStatus.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.occurrences.createdAt))
      .limit(limit)
      .offset(offset);

    // Get summary by status
    const byStatus = await this.db
      .select({
        statusId: schema.occurrenceStatus.id,
        statusName: schema.occurrenceStatus.name,
        count: count(schema.occurrences.id),
      })
      .from(schema.occurrences)
      .leftJoin(
        schema.occurrenceStatus,
        eq(schema.occurrences.statusId, schema.occurrenceStatus.id),
      )
      .where(and(...conditions))
      .groupBy(schema.occurrenceStatus.id, schema.occurrenceStatus.name);

    return {
      data: occurrences,
      meta: {
        total: totalResult.count,
        page,
        limit,
        totalPages: Math.ceil(totalResult.count / limit),
      },
      summary: {
        total: totalResult.count,
        byStatus,
      },
    };
  }
}

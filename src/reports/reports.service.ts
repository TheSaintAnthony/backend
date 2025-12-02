import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { DateRangeDto, GroupByPeriod } from './dto';
import { sql, and, gte, lte, eq, count, sum, desc } from 'drizzle-orm';

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
      .where(eq(schema.reservationStatus.name, 'confirmed'));

    const [completedStatus] = await this.db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, 'completed'));

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
      .where(eq(schema.invoiceStatus.name, 'pending'));

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
      .where(eq(schema.reservationStatus.name, 'cancelled'));

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
          sql`${schema.reservations.statusId} IN (SELECT id FROM ${schema.reservationStatus} WHERE name IN ('confirmed', 'completed'))`,
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
}

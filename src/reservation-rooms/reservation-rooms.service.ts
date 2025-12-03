import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateReservationRoomDto, EditReservationRoomDto } from './dto';
import { eq, and, count } from 'drizzle-orm';

@Injectable()
export class ReservationRoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private generateAccessCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  private async generateUniqueAccessCode(
    checkIn: string,
    checkOut: string,
  ): Promise<number> {
    let code = this.generateAccessCode();
    let exists = true;
    while (exists) {
      const [result] = await this.db
        .select({ count: count() })
        .from(schema.reservationRooms)
        .where(
          and(
            eq(schema.reservationRooms.accessCode, code),
            eq(schema.reservationRooms.checkIn, checkIn),
            eq(schema.reservationRooms.checkOut, checkOut),
          ),
        );
      exists = result.count > 0;
      if (exists) {
        code = this.generateAccessCode();
      }
    }

    return code;
  }

  async createReservationRoom(data: CreateReservationRoomDto) {
    const accessCode = await this.generateUniqueAccessCode(
      data.checkIn,
      data.checkOut,
    );

    return this.db
      .insert(schema.reservationRooms)
      .values({ ...data, accessCode })
      .returning();
  }

  async getReservationRooms() {
    return this.db.select().from(schema.reservationRooms);
  }

  async getReservationRoomById(id: string) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room', id);
    }

    return reservationRoom;
  }

  async getReservationRoomsByReservation(reservationId: string) {
    return this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.reservationId, reservationId));
  }

  async getReservationRoomsByRoom(roomId: string) {
    return this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.roomId, roomId));
  }

  async editReservationRoom(id: string, data: EditReservationRoomDto) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room', id);
    }

    return this.db
      .update(schema.reservationRooms)
      .set({ ...data })
      .where(eq(schema.reservationRooms.id, id))
      .returning();
  }

  async deleteReservationRoom(id: string) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room', id);
    }

    return this.db
      .delete(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id))
      .returning();
  }
}

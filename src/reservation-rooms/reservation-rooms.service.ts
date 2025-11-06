import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateReservationRoomDto, EditReservationRoomDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class ReservationRoomsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createReservationRoom(data: CreateReservationRoomDto) {
    return await this.db
      .insert(schema.reservationRooms)
      .values({ ...data })
      .returning();
  }

  async getReservationRooms() {
    return await this.db.select().from(schema.reservationRooms);
  }

  async getReservationRoomById(id: number) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room not found');
    }

    return reservationRoom;
  }

  async getReservationRoomsByReservation(reservationId: number) {
    return await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.reservationId, reservationId));
  }

  async getReservationRoomsByRoom(roomId: number) {
    return await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.roomId, roomId));
  }

  async editReservationRoom(id: number, data: EditReservationRoomDto) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room not found');
    }

    return await this.db
      .update(schema.reservationRooms)
      .set({ ...data })
      .where(eq(schema.reservationRooms.id, id))
      .returning();
  }

  async deleteReservationRoom(id: number) {
    const [reservationRoom] = await this.db
      .select()
      .from(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id));

    if (!reservationRoom) {
      throw new NotFoundException('Reservation room not found');
    }

    return await this.db
      .delete(schema.reservationRooms)
      .where(eq(schema.reservationRooms.id, id))
      .returning();
  }
}

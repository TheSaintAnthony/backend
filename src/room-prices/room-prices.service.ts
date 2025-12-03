import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRoomPriceDto, EditRoomPriceDto } from './dto';
import { eq } from 'drizzle-orm';
import { StripeService } from 'src/payments/stripe/stripe.service';

@Injectable()
export class RoomPricesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private stripeService: StripeService,
  ) {}

  async createRoomPrice(data: CreateRoomPriceDto) {
    const [roomPrice] = await this.db
      .insert(schema.roomPrices)
      .values({ ...data })
      .returning();

    const [room] = await this.db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, data.roomId));

    if (room && room.stripeProductId) {
      try {
        const priceInCents = Math.round(parseFloat(data.price) * 100);
        const stripePrice = await this.stripeService.createPrice(
          room.stripeProductId,
          priceInCents,
          'eur',
          {
            roomId: data.roomId,
            priceId: roomPrice.id,
          },
        );

        if (!room.stripePriceId) {
          await this.db
            .update(schema.rooms)
            .set({ stripePriceId: stripePrice.id })
            .where(eq(schema.rooms.id, data.roomId));
        }
      } catch (error) {
        console.error('Failed to create Stripe price:', error);
      }
    }

    return roomPrice;
  }

  async getRoomPrices() {
    return this.db.select().from(schema.roomPrices);
  }

  async getRoomPriceById(id: string) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price', id);
    }

    return roomPrice;
  }

  async getRoomPricesByRoom(roomId: string) {
    return this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.roomId, roomId));
  }

  async editRoomPrice(id: string, data: EditRoomPriceDto) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price', id);
    }

    const [updatedPrice] = await this.db
      .update(schema.roomPrices)
      .set({ ...data })
      .where(eq(schema.roomPrices.id, id))
      .returning();

    if (data.price && data.price !== roomPrice.price) {
      const [room] = await this.db
        .select()
        .from(schema.rooms)
        .where(eq(schema.rooms.id, roomPrice.roomId));

      if (room && room.stripeProductId) {
        try {
          const priceInCents = Math.round(parseFloat(data.price) * 100);
          const stripePrice = await this.stripeService.createPrice(
            room.stripeProductId,
            priceInCents,
            'eur',
            {
              roomId: roomPrice.roomId,
              priceId: updatedPrice.id,
            },
          );

          if (room.stripePriceId) {
            await this.db
              .update(schema.rooms)
              .set({ stripePriceId: stripePrice.id })
              .where(eq(schema.rooms.id, roomPrice.roomId));
          }
        } catch (error) {
          console.error('Failed to update Stripe price:', error);
        }
      }
    }

    return updatedPrice;
  }

  async deleteRoomPrice(id: string) {
    const [roomPrice] = await this.db
      .select()
      .from(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id));

    if (!roomPrice) {
      throw new NotFoundException('Room price', id);
    }

    return this.db
      .delete(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id))
      .returning();
  }
}

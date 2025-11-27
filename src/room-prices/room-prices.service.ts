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

    // Get room to check if it has Stripe product
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

        // Update room with Stripe price ID if it's the first price
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
    return await this.db.select().from(schema.roomPrices);
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
    return await this.db
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

    // If price changed, update Stripe price (create new one, archive old)
    if (data.price && data.price !== roomPrice.price) {
      const [room] = await this.db
        .select()
        .from(schema.rooms)
        .where(eq(schema.rooms.id, roomPrice.roomId));

      if (room && room.stripeProductId) {
        try {
          // Note: Stripe prices are immutable, so we create a new one
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

          // Update room with new Stripe price ID if this was the default price
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

    // Note: Stripe prices are immutable and cannot be deleted
    // They can only be archived by archiving the product
    // We just delete from our database

    return await this.db
      .delete(schema.roomPrices)
      .where(eq(schema.roomPrices.id, id))
      .returning();
  }
}

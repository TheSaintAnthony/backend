import type { StripeService } from '../../payments/stripe/stripe.service';
import type { ImagesService } from '../../images/images.service';
import type { RoomPricesService } from '../../room-prices/room-prices.service';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

interface RoomStripeData {
  id: string;
  name: string;
  description: string | null;
  propertyId: string;
  roomTypeId: string | null;
}

/**
 * Creates Stripe product and price for a room
 */
export async function createStripeProductForRoom(
  room: RoomStripeData,
  stripeService: StripeService,
  imagesService: ImagesService,
  roomPricesService: RoomPricesService,
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  const roomImages = await imagesService.getImagesByEntity('room', room.id);
  const imageUrls = roomImages
    .map((img) => img.url)
    .filter((url) => url && url.startsWith('http'));

  const stripeProduct = await stripeService.createProduct(
    room.name,
    room.description || undefined,
    {
      roomId: room.id,
      propertyId: room.propertyId,
      roomTypeId: room.roomTypeId || '',
    },
    imageUrls.length > 0 ? imageUrls : undefined,
  );

  let stripePriceId: string | undefined;
  const roomPrices = await roomPricesService.getRoomPricesByRoom(room.id);
  if (roomPrices.length > 0) {
    const defaultPrice = roomPrices[0];
    const priceInCents = Math.round(parseFloat(defaultPrice.price) * 100);
    const stripePrice = await stripeService.createPrice(
      stripeProduct.id,
      priceInCents,
      'eur',
      {
        roomId: room.id,
        priceId: defaultPrice.id,
      },
    );
    stripePriceId = stripePrice.id;
  }

  await db
    .update(schema.rooms)
    .set({
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePriceId,
    })
    .where(eq(schema.rooms.id, room.id));
}

/**
 * Updates Stripe product for a room when images change
 */
export async function updateStripeProductImages(
  roomId: string,
  stripeProductId: string,
  stripeService: StripeService,
  imagesService: ImagesService,
): Promise<void> {
  const roomImages = await imagesService.getImagesByEntity('room', roomId);
  const imageUrls = roomImages
    .map((img) => img.url)
    .filter((url) => url && url.startsWith('http'));

  await stripeService.updateProduct(stripeProductId, {
    images: imageUrls.length > 0 ? imageUrls : undefined,
  });
}

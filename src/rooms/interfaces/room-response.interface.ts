import { AmenityHighlight } from './amenity-highlight.interface';
export interface RoomResponse {
  id: string;
  propertyId: string;
  name: string | null;
  description: string | null;
  bedCount: number | null;
  bathroomCount: number | null;
  quantity: number | null;
  available: boolean | null;
  roomType: string | null;
  maxCapacity: number | null;
  amenities: AmenityHighlight[] | null;
  highlights: AmenityHighlight[] | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  images?: Array<{ url: string; isPrimary: boolean }> | null;
}

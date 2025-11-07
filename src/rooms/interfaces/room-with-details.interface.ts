import { AmenityHighlight } from './amenity-highlight.interface';

export interface RoomWithDetails {
  id: number;
  name: string | null;
  description: string | null;
  bedCount: number | null;
  bathroomCount: number | null;
  available: boolean | null;
  roomType: string | null;
  maxCapacity: number | null;
  amenities: AmenityHighlight[];
  highlights: AmenityHighlight[];
}

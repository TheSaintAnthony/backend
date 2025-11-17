import { AmenityHighlight } from './amenity-highlight.interface';

export interface RoomWithDetails {
  id: string;
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

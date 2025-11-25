import { NestedImageDto } from 'src/images/dto/nested-image.dto';

export interface ActivityData {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  duration: string;
  maxGuests?: number;
  images?: NestedImageDto[];
}

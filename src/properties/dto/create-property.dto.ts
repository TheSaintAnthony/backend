import { CreateAddressDto } from 'src/addresses/dto';

export class CreatePropertyDto {
  name: string;
  description: string;
  about: string;
  address: CreateAddressDto;
  email: string;
  phoneNumber: string;
  checkInTime: string;
  checkOutTime: string;
}

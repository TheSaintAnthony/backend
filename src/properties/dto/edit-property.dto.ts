import { EditAddressDto } from 'src/addresses/dto';

export class EditPropertyDto {
  name: string;
  description: string;
  about: string;
  address: EditAddressDto;
  email: string;
  phoneNumber: string;
  checkInTime: string;
  checkOutTime: string;
}

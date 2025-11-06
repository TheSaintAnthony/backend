import { EditAddressDto } from 'src/addresses/dto';

export class EditUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: EditAddressDto;
}

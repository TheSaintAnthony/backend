export class SignInDto {
  email: string;
  password: string;
}

export class SignUpDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: AddressDto;
}

class AddressDto {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export class PasswordResetDto {
  token: string;
  password: string;
}

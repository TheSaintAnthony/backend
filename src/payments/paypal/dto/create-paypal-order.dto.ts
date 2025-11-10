import { IsInt, IsPositive, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaypalOrderDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  invoiceId: number;

  @ApiProperty()
  @IsNumberString()
  amount: string;
}

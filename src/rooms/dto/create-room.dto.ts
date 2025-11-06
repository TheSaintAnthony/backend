import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsInt()
  @IsPositive()
  propertyId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  roomTypeId?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathroomCount?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

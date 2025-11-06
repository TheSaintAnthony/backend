import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class EditRoomDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  roomTypeId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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

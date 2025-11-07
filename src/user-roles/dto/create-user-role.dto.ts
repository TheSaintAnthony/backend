import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserRoleDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiProperty({ description: 'Role ID', example: 1 })
  @IsInt()
  @IsPositive()
  roleId: number;
}

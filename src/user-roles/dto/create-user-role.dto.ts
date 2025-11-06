import { IsInt, IsPositive } from 'class-validator';

export class CreateUserRoleDto {
  @IsInt()
  @IsPositive()
  userId: number;

  @IsInt()
  @IsPositive()
  roleId: number;
}

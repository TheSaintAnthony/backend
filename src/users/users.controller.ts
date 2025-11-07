import { Body, Controller, Delete, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { EditUserDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getUserById(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.usersService.getUserById(userId);
  }

  @Patch('me')
  async editUser(@Req() req: AuthenticatedRequest, @Body() dto: EditUserDto) {
    const userId = req.user.sub;
    return this.usersService.editUser(userId, dto);
  }

  @Delete('me')
  async deleteUser(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.usersService.deleteUser(userId);
  }
}

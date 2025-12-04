import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { EditUserDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}
  @Roles(UserRole.ADMIN)
  @Get()
  async getUsers(@Query() pagination: PaginationDto) {
    return this.usersService.getUsers(pagination);
  }
  @Get('me')
  async getUserById(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.usersService.getUserById(userId);
  }
  @Roles(UserRole.ADMIN)
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    return user;
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

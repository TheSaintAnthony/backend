import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';

@ApiTags('User Roles')
@ApiBearerAuth('access-token')
@Controller('user/roles')
export class UserRolesController {
  constructor(private userRolesService: UserRolesService) {}

  @Get()
  async getUserRoles(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return await this.userRolesService.getUserRolesByUser(userId);
  }

  @Get(':id')
  async getUserRoleById(@Param('id', ParseIntPipe) id: number) {
    return await this.userRolesService.getUserRoleById(id);
  }

  @Post()
  async createUserRole(@Body() body: CreateUserRoleDto) {
    return await this.userRolesService.createUserRole(body);
  }

  @Delete(':id')
  async deleteUserRole(@Param('id', ParseIntPipe) id: number) {
    return await this.userRolesService.deleteUserRole(id);
  }
}

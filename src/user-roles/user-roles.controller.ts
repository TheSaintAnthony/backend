import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
@ApiTags('User Roles')
@ApiBearerAuth('access-token')
@Controller('user/roles')
export class UserRolesController {
  constructor(private userRolesService: UserRolesService) {}
  @Roles(UserRole.ADMIN)
  @Get()
  async getUserRoles(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = userId || req.user.sub;
    return await this.userRolesService.getUserRolesByUser(targetUserId);
  }
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getUserRoleById(@Param('id') id: string) {
    return await this.userRolesService.getUserRoleById(id);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createUserRole(@Body() body: CreateUserRoleDto) {
    return await this.userRolesService.createUserRole(body);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteUserRole(@Param('id') id: string) {
    return await this.userRolesService.deleteUserRole(id);
  }
}

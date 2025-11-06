import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto';

@Controller('user-roles')
export class UserRolesController {
  constructor(private userRolesService: UserRolesService) {}

  @Get()
  async getUserRoles(@Query('userId', ParseIntPipe) userId?: number) {
    if (userId) {
      return await this.userRolesService.getUserRolesByUser(userId);
    }
    return await this.userRolesService.getUserRoles();
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

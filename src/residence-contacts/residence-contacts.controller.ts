import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResidenceContactsService } from './residence-contacts.service';
import { CreateResidenceContactDto } from './dto/create-residence-contact.dto';
import { EditResidenceContactDto } from './dto/edit-residence-contact.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
@ApiTags('Residence Contacts')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('residence-contacts')
export class ResidenceContactsController {
  constructor(private residenceContactsService: ResidenceContactsService) {}
  @Public()
  @Post()
  async createResidenceContact(@Body() dto: CreateResidenceContactDto) {
    return await this.residenceContactsService.createResidenceContact(dto);
  }
  @Roles(UserRole.ADMIN)
  @Get()
  async getResidenceContacts(
    @Query() pagination: PaginationDto,
    @Query('residenceId') residenceId?: string,
    @Query('residenceUnitId') residenceUnitId?: string,
    @Query('status') status?: string,
  ) {
    return this.residenceContactsService.getResidenceContacts(
      pagination,
      residenceId,
      residenceUnitId,
      status,
    );
  }
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getResidenceContactById(@Param('id') id: string) {
    return await this.residenceContactsService.getResidenceContactById(id);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editResidenceContact(
    @Param('id') id: string,
    @Body() dto: EditResidenceContactDto,
  ) {
    return await this.residenceContactsService.editResidenceContact(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteResidenceContact(@Param('id') id: string) {
    return await this.residenceContactsService.deleteResidenceContact(id);
  }
}

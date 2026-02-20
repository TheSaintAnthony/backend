import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, GetContactsDto } from './dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';

@ApiTags('Contacts')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Public()
  @Post()
  async createContact(@Body() dto: CreateContactDto) {
    return this.contactsService.createContact(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async getContacts(@Query() query: GetContactsDto) {
    return this.contactsService.getContacts(query);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getContactById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.getContactById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteContact(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.deleteContact(id);
  }
}

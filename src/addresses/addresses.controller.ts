import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, EditAddressDto } from './dto';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@Controller('addresses')
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Get()
  async getAddresses() {
    return this.addressesService.getAddresses();
  }

  @Get(':id')
  async getAddressesById(@Param('id') id: string) {
    return this.addressesService.getAddressById(id);
  }

  @Post()
  async createAddress(@Body() body: CreateAddressDto) {
    return this.addressesService.createAddress(body);
  }

  @Patch(':id')
  async editAddress(@Param('id') id: string, @Body() body: EditAddressDto) {
    return this.addressesService.editAddress(id, body);
  }

  @Delete(':id')
  async deleteAddress(@Param('id') id: string) {
    return this.addressesService.deleteAddress(id);
  }
}

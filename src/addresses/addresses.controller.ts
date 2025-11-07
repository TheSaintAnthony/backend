import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
    return await this.addressesService.getAddresses();
  }

  @Get(':id')
  async getAddressesById(@Param('id', ParseIntPipe) id: number) {
    return await this.addressesService.getAddressById(id);
  }

  @Post()
  async createAddress(@Body() body: CreateAddressDto) {
    return await this.addressesService.createAddress(body);
  }

  @Patch(':id')
  async editAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditAddressDto,
  ) {
    return await this.addressesService.editAddress(id, body);
  }

  @Delete(':id')
  async deleteAddress(@Param('id', ParseIntPipe) id: number) {
    return await this.addressesService.deleteAddress(id);
  }
}

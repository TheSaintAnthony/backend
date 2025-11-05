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
import { LookupsService } from './lookups.service';

@Controller()
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Post('amenities')
  addAmenity(@Body('name') name: string) {
    return this.lookupsService.addAmenity(name);
  }

  @Get('amenities')
  getAmenities() {
    return this.lookupsService.getAmenities();
  }

  @Get('amenities/:id')
  getAmenityById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getAmenityById(id);
  }

  @Patch('amenities/:id')
  editAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editAmenity(id, name);
  }

  @Delete('amenities/:id')
  deleteAmenity(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteAmenity(id);
  }

  @Post('room/types')
  addRoomType(@Body() body: { name: string; maxCapacity: number }) {
    return this.lookupsService.addRoomType(body.name, body.maxCapacity);
  }

  @Get('room/types')
  getRoomTypes() {
    return this.lookupsService.getRoomTypes();
  }

  @Get('room/types/:id')
  getRoomTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getRoomTypeById(id);
  }

  @Patch('room/types/:id')
  editRoomType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; maxCapacity: number },
  ) {
    return this.lookupsService.editRoomType(id, body.name, body.maxCapacity);
  }

  @Delete('room/types/:id')
  deleteRoomType(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteRoomType(id);
  }

  @Post('highlights')
  addHighlight(@Body('name') name: string) {
    return this.lookupsService.addHighlight(name);
  }

  @Get('highlights')
  getHighlights() {
    return this.lookupsService.getHighlights();
  }

  @Get('highlights/:id')
  getHighlightById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getHighlightById(id);
  }

  @Patch('highlights/:id')
  editHighlight(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editHighlight(id, name);
  }

  @Delete('highlights/:id')
  deleteHighlight(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteHighlight(id);
  }

  @Post('reservation/status')
  addReservationStatus(@Body('name') name: string) {
    return this.lookupsService.addReservationStatus(name);
  }

  @Get('reservation/status')
  getReservationStatus() {
    return this.lookupsService.getReservationStatus();
  }

  @Get('reservation/status/:id')
  getReservationStatusById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getReservationStatusById(id);
  }

  @Patch('reservation/status/:id')
  editReservationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editReservationStatus(id, name);
  }

  @Delete('reservation/status/:id')
  deleteReservationStatus(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteReservationStatus(id);
  }

  @Post('invoice/status')
  addInvoiceStatus(@Body('name') name: string) {
    return this.lookupsService.addInvoiceStatus(name);
  }

  @Get('invoice/status')
  getInvoiceStatus() {
    return this.lookupsService.getInvoiceStatus();
  }

  @Get('invoice/status/:id')
  getInvoiceStatusById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getInvoiceStatusById(id);
  }

  @Patch('invoice/status/:id')
  editInvoiceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editInvoiceStatus(id, name);
  }

  @Delete('invoice/status/:id')
  deleteInvoiceStatus(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteInvoiceStatus(id);
  }

  @Post('occurrence/status')
  addOccurrenceStatus(@Body('name') name: string) {
    return this.lookupsService.addOccurrenceStatus(name);
  }

  @Get('occurrence/status')
  getOccurrenceStatus() {
    return this.lookupsService.getOccurrenceStatus();
  }

  @Get('occurrence/status/:id')
  getOccurrenceStatusById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getOccurrenceStatusById(id);
  }

  @Patch('occurrence/status/:id')
  editOccurrenceStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editOccurrenceStatus(id, name);
  }

  @Delete('occurrence/status/:id')
  deleteOccurrenceStatus(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteOccurrenceStatus(id);
  }

  @Post('roles')
  addRole(@Body('name') name: string) {
    return this.lookupsService.addRole(name);
  }

  @Get('roles')
  getRoles() {
    return this.lookupsService.getRoles();
  }

  @Get('roles/:id')
  getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getRoleById(id);
  }

  @Patch('roles/:id')
  editRole(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.lookupsService.editRole(id, name);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteRole(id);
  }

  @Post('payment/status')
  addPaymentStatus(@Body('name') name: string) {
    return this.lookupsService.addPaymentStatus(name);
  }

  @Get('payment/status')
  getPaymentStatus() {
    return this.lookupsService.getPaymentStatus();
  }

  @Get('payment/status/:id')
  getPaymentStatusById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getPaymentStatusById(id);
  }

  @Patch('payment/status/:id')
  editPaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editPaymentStatus(id, name);
  }

  @Delete('payment/status/:id')
  deletePaymentStatus(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deletePaymentStatus(id);
  }

  @Post('payment/methods')
  addPaymentMethod(@Body('name') name: string) {
    return this.lookupsService.addPaymentMethod(name);
  }

  @Get('payment/methods')
  getPaymentMethods() {
    return this.lookupsService.getPaymentMethods();
  }

  @Get('payment/methods/:id')
  getPaymentMethodById(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.getPaymentMethodById(id);
  }

  @Patch('payment/methods/:id')
  editPaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    return this.lookupsService.editPaymentMethod(id, name);
  }

  @Delete('payment/methods/:id')
  deletePaymentMethod(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deletePaymentMethod(id);
  }
}

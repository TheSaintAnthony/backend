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
import { LookupsService } from './lookups.service';
import { CreateLookupDto, CreateRoomTypeDto, CreateActivityDto } from './dto';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Lookups')
@ApiBearerAuth('access-token')
@Controller()
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Post('amenities')
  addAmenity(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addAmenity(dto.name);
  }

  @Public()
  @Get('amenities')
  getAmenities() {
    return this.lookupsService.getAmenities();
  }

  @Public()
  @Get('amenities/:id')
  getAmenityById(@Param('id') id: string) {
    return this.lookupsService.getAmenityById(id);
  }

  @Patch('amenities/:id')
  editAmenity(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editAmenity(id, dto.name);
  }

  @Delete('amenities/:id')
  deleteAmenity(@Param('id') id: string) {
    return this.lookupsService.deleteAmenity(id);
  }

  @Post('room/types')
  addRoomType(@Body() dto: CreateRoomTypeDto) {
    return this.lookupsService.addRoomType(dto.name, dto.maxCapacity);
  }

  @Public()
  @Get('room/types')
  getRoomTypes() {
    return this.lookupsService.getRoomTypes();
  }

  @Public()
  @Get('room/types/:id')
  getRoomTypeById(@Param('id') id: string) {
    return this.lookupsService.getRoomTypeById(id);
  }

  @Patch('room/types/:id')
  editRoomType(@Param('id') id: string, @Body() dto: CreateRoomTypeDto) {
    return this.lookupsService.editRoomType(id, dto.name, dto.maxCapacity);
  }

  @Delete('room/types/:id')
  deleteRoomType(@Param('id') id: string) {
    return this.lookupsService.deleteRoomType(id);
  }

  @Post('highlights')
  addHighlight(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addHighlight(dto.name);
  }

  @Public()
  @Get('highlights')
  getHighlights() {
    return this.lookupsService.getHighlights();
  }

  @Public()
  @Get('highlights/:id')
  getHighlightById(@Param('id') id: string) {
    return this.lookupsService.getHighlightById(id);
  }

  @Patch('highlights/:id')
  editHighlight(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editHighlight(id, dto.name);
  }

  @Delete('highlights/:id')
  deleteHighlight(@Param('id') id: string) {
    return this.lookupsService.deleteHighlight(id);
  }

  @Post('reservation/status')
  addReservationStatus(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addReservationStatus(dto.name);
  }

  @Public()
  @Get('reservation/status')
  getReservationStatus() {
    return this.lookupsService.getReservationStatus();
  }

  @Public()
  @Get('reservation/status/:id')
  getReservationStatusById(@Param('id') id: string) {
    return this.lookupsService.getReservationStatusById(id);
  }

  @Patch('reservation/status/:id')
  editReservationStatus(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editReservationStatus(id, dto.name);
  }

  @Delete('reservation/status/:id')
  deleteReservationStatus(@Param('id') id: string) {
    return this.lookupsService.deleteReservationStatus(id);
  }

  @Post('invoice/status')
  addInvoiceStatus(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addInvoiceStatus(dto.name);
  }

  @Public()
  @Get('invoice/status')
  getInvoiceStatus() {
    return this.lookupsService.getInvoiceStatus();
  }

  @Public()
  @Get('invoice/status/:id')
  getInvoiceStatusById(@Param('id') id: string) {
    return this.lookupsService.getInvoiceStatusById(id);
  }

  @Patch('invoice/status/:id')
  editInvoiceStatus(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editInvoiceStatus(id, dto.name);
  }

  @Delete('invoice/status/:id')
  deleteInvoiceStatus(@Param('id') id: string) {
    return this.lookupsService.deleteInvoiceStatus(id);
  }

  @Post('occurrence/status')
  addOccurrenceStatus(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addOccurrenceStatus(dto.name);
  }

  @Public()
  @Get('occurrence/status')
  getOccurrenceStatus() {
    return this.lookupsService.getOccurrenceStatus();
  }

  @Public()
  @Get('occurrence/status/:id')
  getOccurrenceStatusById(@Param('id') id: string) {
    return this.lookupsService.getOccurrenceStatusById(id);
  }

  @Patch('occurrence/status/:id')
  editOccurrenceStatus(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editOccurrenceStatus(id, dto.name);
  }

  @Delete('occurrence/status/:id')
  deleteOccurrenceStatus(@Param('id') id: string) {
    return this.lookupsService.deleteOccurrenceStatus(id);
  }

  @Post('roles')
  addRole(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addRole(dto.name);
  }

  @Get('roles')
  getRoles() {
    return this.lookupsService.getRoles();
  }

  @Get('roles/:id')
  getRoleById(@Param('id') id: string) {
    return this.lookupsService.getRoleById(id);
  }

  @Patch('roles/:id')
  editRole(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editRole(id, dto.name);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.lookupsService.deleteRole(id);
  }

  @Post('payment/status')
  addPaymentStatus(@Body() dto: CreateLookupDto) {
    return this.lookupsService.addPaymentStatus(dto.name);
  }

  @Public()
  @Get('payment/status')
  getPaymentStatus() {
    return this.lookupsService.getPaymentStatus();
  }

  @Public()
  @Get('payment/status/:id')
  getPaymentStatusById(@Param('id') id: string) {
    return this.lookupsService.getPaymentStatusById(id);
  }

  @Patch('payment/status/:id')
  editPaymentStatus(@Param('id') id: string, @Body() dto: CreateLookupDto) {
    return this.lookupsService.editPaymentStatus(id, dto.name);
  }

  @Delete('payment/status/:id')
  deletePaymentStatus(@Param('id') id: string) {
    return this.lookupsService.deletePaymentStatus(id);
  }


  @Post('activities')
  addActivity(@Body() dto: CreateActivityDto) {
    return this.lookupsService.addActivity(dto);
  }

  @Public()
  @Get('activities')
  getActivities() {
    return this.lookupsService.getActivities();
  }

  @Public()
  @Get('activities/:id')
  getActivityById(@Param('id') id: string) {
    return this.lookupsService.getActivityById(id);
  }

  @Patch('activities/:id')
  editActivity(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.lookupsService.editActivity(id, dto);
  }

  @Delete('activities/:id')
  deleteActivity(@Param('id') id: string) {
    return this.lookupsService.deleteActivity(id);
  }

  @Post('activity-categories')
  addActivityCategory(@Body() body: { name: string }) {
    return this.lookupsService.addActivityCategory(body.name);
  }

  @Public()
  @Get('activity-categories')
  getActivityCategories() {
    return this.lookupsService.getActivityCategories();
  }

  @Public()
  @Get('activity-categories/:id')
  getActivityCategoryById(@Param('id') id: string) {
    return this.lookupsService.getActivityCategoryById(id);
  }

  @Patch('activity-categories/:id')
  editActivityCategory(
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.lookupsService.editActivityCategory(id, body.name);
  }

  @Delete('activity-categories/:id')
  deleteActivityCategory(@Param('id') id: string) {
    return this.lookupsService.deleteActivityCategory(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';

@ApiTags('Occurrences')
@ApiBearerAuth('access-token')
@Controller('occurrences')
export class OccurrencesController {
  constructor(private occurrencesService: OccurrencesService) {}

  @Get()
  async getOccurrences(
    @Query('reservationId', ParseIntPipe) reservationId?: number,
  ) {
    if (reservationId) {
      return await this.occurrencesService.getOccurrencesByReservation(
        reservationId,
      );
    }
    return await this.occurrencesService.getOccurrences();
  }

  @Get(':id')
  async getOccurrenceById(@Param('id', ParseIntPipe) id: number) {
    return await this.occurrencesService.getOccurrenceById(id);
  }

  @Post()
  async createOccurrence(@Body() body: CreateOccurrenceDto) {
    return await this.occurrencesService.createOccurrence(body);
  }

  @Patch(':id')
  async editOccurrence(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditOccurrenceDto,
  ) {
    return await this.occurrencesService.editOccurrence(id, body);
  }

  @Delete(':id')
  async deleteOccurrence(@Param('id', ParseIntPipe) id: number) {
    return await this.occurrencesService.deleteOccurrence(id);
  }
}

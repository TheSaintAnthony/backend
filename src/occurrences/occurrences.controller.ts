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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Occurrences')
@ApiBearerAuth('access-token')
@Controller('occurrences')
export class OccurrencesController {
  constructor(private occurrencesService: OccurrencesService) {}

  @Get()
  async getOccurrences(
    @Query('reservationId', new ParseUUIDPipe({ optional: true }))
    reservationId: string | undefined,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination: PaginationDto = {
      page: page || 1,
      limit: limit || 10,
    };

    if (reservationId !== undefined) {
      return await this.occurrencesService.getOccurrencesByReservation(
        reservationId,
        pagination,
      );
    }
    return await this.occurrencesService.getOccurrences(pagination);
  }

  @Get(':id')
  async getOccurrenceById(@Param('id') id: string) {
    return await this.occurrencesService.getOccurrenceById(id);
  }

  @Post()
  async createOccurrence(@Body() body: CreateOccurrenceDto) {
    return await this.occurrencesService.createOccurrence(body);
  }

  @Patch(':id')
  async editOccurrence(
    @Param('id') id: string,
    @Body() body: EditOccurrenceDto,
  ) {
    return await this.occurrencesService.editOccurrence(id, body);
  }

  @Delete(':id')
  async deleteOccurrence(@Param('id') id: string) {
    return await this.occurrencesService.deleteOccurrence(id);
  }
}

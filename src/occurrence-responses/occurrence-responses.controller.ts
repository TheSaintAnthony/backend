import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OccurrenceResponsesService } from './occurrence-responses.service';
import { CreateOccurrenceResponseDto } from './dto';
import { BadRequestException } from 'src/filters';
@ApiTags('Occurrence Responses')
@ApiBearerAuth('access-token')
@Controller('occurrences/responses')
export class OccurrenceResponsesController {
  constructor(private occurrenceResponsesService: OccurrenceResponsesService) {}
  @Post()
  async createResponse(@Body() body: CreateOccurrenceResponseDto) {
    return await this.occurrenceResponsesService.createResponse(body);
  }
  @Get()
  async getResponsesByOccurrence(
    @Query('occurrenceId') occurrenceId?: string,
  ) {
    if (!occurrenceId) {
      throw new BadRequestException('occurrenceId query parameter is required');
    }
    return await this.occurrenceResponsesService.getResponsesByOccurrence(
      occurrenceId,
    );
  }
}

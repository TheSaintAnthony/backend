import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OccurrenceResponsesService } from './occurrence-responses.service';
import { CreateOccurrenceResponseDto } from './dto';

@ApiTags('Occurrence Responses')
@ApiBearerAuth('access-token')
@Controller('occurrence-responses')
export class OccurrenceResponsesController {
  constructor(
    private occurrenceResponsesService: OccurrenceResponsesService,
  ) {}

  @Post()
  async createResponse(@Body() body: CreateOccurrenceResponseDto) {
    return await this.occurrenceResponsesService.createResponse(body);
  }

  @Get('occurrence/:occurrenceId')
  async getResponsesByOccurrence(@Param('occurrenceId') occurrenceId: string) {
    return await this.occurrenceResponsesService.getResponsesByOccurrence(
      occurrenceId,
    );
  }
}


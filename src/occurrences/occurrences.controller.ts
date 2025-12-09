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
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto, EditOccurrenceDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
@ApiTags('Occurrences')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('occurrences')
export class OccurrencesController {
  constructor(private occurrencesService: OccurrencesService) {}
  @Get()
  async getOccurrences(
    @Query('reservationId', new ParseUUIDPipe({ optional: true }))
    reservationId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    if (reservationId !== undefined) {
      return await this.occurrencesService.getOccurrencesByReservation(
        reservationId,
        pagination,
      );
    }
    return await this.occurrencesService.getOccurrences(pagination);
  }

  @Get('my')
  async getMyOccurrences(
    @Request() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    return await this.occurrencesService.getOccurrencesByUser(
      req.user.sub,
      pagination,
    );
  }

  @Get('my/unread-count')
  async getMyUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.occurrencesService.getUnreadCountByUser(
      req.user.sub,
    );
    return { count };
  }

  @Post('my/:id/mark-read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.occurrencesService.markAsRead(id, req.user.sub);
    return { success: true };
  }

  @Get(':id')
  async getOccurrenceById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.occurrencesService.getOccurrenceById(id);
  }
  @Post()
  async createOccurrence(@Body() body: CreateOccurrenceDto) {
    return await this.occurrencesService.createOccurrence(body);
  }
  @Patch(':id')
  async editOccurrence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EditOccurrenceDto,
  ) {
    return await this.occurrencesService.editOccurrence(id, body);
  }
  @Delete(':id')
  async deleteOccurrence(@Param('id', ParseUUIDPipe) id: string) {
    return await this.occurrencesService.deleteOccurrence(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResidencesService } from './residences.service';
import { CreateResidenceDto } from './dto/create-residence.dto';
import { EditResidenceDto } from './dto/edit-residence.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { parseAcceptLanguage } from 'src/common/utils/localize';
@ApiTags('Residences')
@ApiBearerAuth('access-token')
@Controller('residences')
export class ResidencesController {
  constructor(private residencesService: ResidencesService) {}
  @Public()
  @Get()
  async getResidences(
    @Query() pagination: PaginationDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.residencesService.getResidences(pagination, locale);
  }
  @Public()
  @Get(':id')
  async getResidenceById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return await this.residencesService.getResidenceById(id, locale);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createResidence(@Body() dto: CreateResidenceDto) {
    return await this.residencesService.createResidence(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editResidence(@Param('id') id: string, @Body() dto: EditResidenceDto) {
    return await this.residencesService.editResidence(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteResidence(@Param('id') id: string) {
    return await this.residencesService.deleteResidence(id);
  }
}

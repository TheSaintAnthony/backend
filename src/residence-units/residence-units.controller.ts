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
import { ResidenceUnitsService } from './residence-units.service';
import { CreateResidenceUnitDto } from './dto/create-residence-unit.dto';
import { EditResidenceUnitDto } from './dto/edit-residence-unit.dto';
import { GetResidenceUnitsDto } from './dto/get-residence-units.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { parseAcceptLanguage } from 'src/common/utils/localize';
@ApiTags('Residence Units')
@ApiBearerAuth('access-token')
@Controller('residence-units')
export class ResidenceUnitsController {
  constructor(private residenceUnitsService: ResidenceUnitsService) {}
  @Public()
  @Get()
  async getResidenceUnits(
    @Query() query: GetResidenceUnitsDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const { residenceId, ...pagination } = query;
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.residenceUnitsService.getResidenceUnits(
      pagination,
      residenceId,
      locale,
    );
  }
  @Public()
  @Get(':id')
  async getResidenceUnitById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return await this.residenceUnitsService.getResidenceUnitById(id, locale);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createResidenceUnit(@Body() dto: CreateResidenceUnitDto) {
    return await this.residenceUnitsService.createResidenceUnit(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editResidenceUnit(
    @Param('id') id: string,
    @Body() dto: EditResidenceUnitDto,
  ) {
    return await this.residenceUnitsService.editResidenceUnit(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteResidenceUnit(@Param('id') id: string) {
    return await this.residenceUnitsService.deleteResidenceUnit(id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  ValidatePromoCodeDto,
  UpdatePromoCodeVisibilityDto,
} from './dto';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated.request';

@ApiTags('Promo Codes')
@ApiBearerAuth('access-token')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private promoCodesService: PromoCodesService) {}

  // ==================== ADMIN ENDPOINTS ====================

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new promo code (Admin)' })
  async createPromoCode(@Body() dto: CreatePromoCodeDto) {
    return await this.promoCodesService.createPromoCode(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Get all promo codes (Admin)' })
  async getPromoCodes(@Query() pagination: PaginationDto) {
    return this.promoCodesService.getPromoCodes(pagination);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get promo code by ID (Admin)' })
  async getPromoCodeById(@Param('id') id: string) {
    return await this.promoCodesService.getPromoCodeById(id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id/redemptions')
  @ApiOperation({ summary: 'Get redemption history for a promo code (Admin)' })
  async getRedemptionHistory(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return await this.promoCodesService.getRedemptionHistory(id, pagination);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a promo code (Admin)' })
  async deactivatePromoCode(@Param('id') id: string) {
    return await this.promoCodesService.deactivatePromoCode(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Update promo code visibility (Admin)' })
  async updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeVisibilityDto,
  ) {
    return await this.promoCodesService.updateVisibility(
      id,
      dto.isVisibleToUsers,
    );
  }

  // ==================== USER ENDPOINTS ====================

  @Get('available')
  @ApiOperation({ summary: 'Get available promo codes for current user' })
  async getAvailablePromoCodes(@Request() req: AuthenticatedRequest) {
    return this.promoCodesService.getVisiblePromoCodesForUser(req.user.sub);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a promo code' })
  async validatePromoCode(
    @Body() dto: ValidatePromoCodeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.validatePromoCode({
      ...dto,
      userId: req.user.sub,
    });
  }
}

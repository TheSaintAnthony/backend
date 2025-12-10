import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { EditRestaurantDto } from './dto/edit-restaurant.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
@ApiTags('Restaurants')
@ApiBearerAuth('access-token')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}
  @Public()
  @Get()
  async getRestaurants(@Query() pagination: PaginationDto) {
    return this.restaurantsService.getRestaurants(pagination);
  }
  @Public()
  @Get(':id')
  async getRestaurantById(@Param('id') id: string) {
    return await this.restaurantsService.getRestaurantById(id);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createRestaurant(@Body() dto: CreateRestaurantDto) {
    return await this.restaurantsService.createRestaurant(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editRestaurant(
    @Param('id') id: string,
    @Body() dto: EditRestaurantDto,
  ) {
    return await this.restaurantsService.editRestaurant(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRestaurant(@Param('id') id: string) {
    return await this.restaurantsService.deleteRestaurant(id);
  }
}

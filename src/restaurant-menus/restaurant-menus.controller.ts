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
import { RestaurantMenusService } from './restaurant-menus.service';
import {
  CreateRestaurantMenuDto,
  EditRestaurantMenuDto,
  CreateMenuItemDto,
  EditMenuItemDto,
  GetMenusDto,
  GetMenuItemsDto,
} from './dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
@ApiTags('Restaurant Menus')
@ApiBearerAuth('access-token')
@Controller('restaurant-menus')
export class RestaurantMenusController {
  constructor(private restaurantMenusService: RestaurantMenusService) {}
  @Public()
  @Get()
  async getMenus(@Query() query: GetMenusDto) {
    if (query.restaurantId) {
      const { restaurantId, ...pagination } = query;
      return this.restaurantMenusService.getMenus(pagination, restaurantId);
    }
    const { restaurantId, ...pagination } = query;
    return this.restaurantMenusService.getMenus(pagination);
  }
  @Public()
  @Get('items')
  async getMenuItems(@Query() query: GetMenuItemsDto) {
    if (query.menuId) {
      const { menuId, ...pagination } = query;
      return this.restaurantMenusService.getMenuItems(pagination, menuId);
    }
    const { menuId, ...pagination } = query;
    return this.restaurantMenusService.getMenuItems(pagination);
  }
  @Public()
  @Get('items/:id')
  async getMenuItemById(@Param('id') id: string) {
    return await this.restaurantMenusService.getMenuItemById(id);
  }
  @Public()
  @Get(':id')
  async getMenuById(@Param('id') id: string) {
    return await this.restaurantMenusService.getMenuById(id);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createMenu(@Body() dto: CreateRestaurantMenuDto) {
    return await this.restaurantMenusService.createMenu(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editMenu(
    @Param('id') id: string,
    @Body() dto: EditRestaurantMenuDto,
  ) {
    return await this.restaurantMenusService.editMenu(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteMenu(@Param('id') id: string) {
    return await this.restaurantMenusService.deleteMenu(id);
  }
  @Roles(UserRole.ADMIN)
  @Post('items')
  async createMenuItem(@Body() dto: CreateMenuItemDto) {
    return await this.restaurantMenusService.createMenuItem(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch('items/:id')
  async editMenuItem(
    @Param('id') id: string,
    @Body() dto: EditMenuItemDto,
  ) {
    return await this.restaurantMenusService.editMenuItem(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete('items/:id')
  async deleteMenuItem(@Param('id') id: string) {
    return await this.restaurantMenusService.deleteMenuItem(id);
  }
}

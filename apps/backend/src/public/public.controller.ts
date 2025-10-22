import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('restaurants/:slug')
  getRestaurant(@Param('slug') slug: string) {
    return this.publicService.getRestaurantBySlug(slug);
  }

  @Get('restaurants/:slug/menu')
  async getMenu(@Param('slug') slug: string) {
    const restaurant = await this.publicService.getRestaurantBySlug(slug);
    const menu = await this.publicService.getMenuForRestaurant(restaurant.id);
    return { restaurant, menu };
  }

  @Get('restaurants/:slug/orders/:orderId')
  getPublicOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.getOrderById(slug, orderId);
  }
}

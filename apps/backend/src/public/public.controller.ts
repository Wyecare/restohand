import { Controller, Get, Param, Res } from '@nestjs/common';
import { PublicService } from './public.service';
import { Response } from 'express';

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

  @Get('restaurants/:slug/orders/:orderId/bill')
  async getInvoice(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    const invoice = await this.publicService.getInvoice(slug, orderId);
    res
      .header('Content-Type', 'text/html; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="${invoice.filename}"`
      )
      .send(invoice.html);
  }
}

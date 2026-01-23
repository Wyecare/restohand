import { Controller, Get, Param, Post, Res, Query } from '@nestjs/common';
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
  async getMenu(@Param('slug') slug: string, @Query('table') table?: string) {
    const restaurant = await this.publicService.getRestaurantBySlug(slug);

    // CRITICAL FIX: Determine branch from table to prevent cross-branch menu contamination
    let branchId: string | undefined;
    if (table?.trim()) {
      branchId = await this.publicService.getBranchIdFromTable(restaurant.id, table.trim());
    }

    // Load menu filtered by branch - this prevents Branch A customers seeing Branch B items
    const menu = await this.publicService.getMenuForRestaurant(restaurant.id, branchId);

    // If table is specified, check for active orders on that table
    let activeOrder = null;
    if (table?.trim()) {
      activeOrder = await this.publicService.getActiveOrderForTable(
        restaurant.id,
        table.trim(),
        restaurant.slug
      );
    }

    return { restaurant, menu, activeOrder };
  }

  @Get('restaurants/:slug/orders/:orderId')
  getPublicOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.getOrderById(slug, orderId);
  }

  @Post('restaurants/:slug/orders/:orderId/cancel')
  cancelPublicOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.cancelOrder(slug, orderId);
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

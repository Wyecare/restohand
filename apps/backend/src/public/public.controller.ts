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
  async getMenu(@Param('slug') slug: string, @Query('table') table?: string, @Query('tableId') tableId?: string) {
    console.log('🔥 PUBLIC MENU DEBUG: Starting request', { slug, table, tableId });

    const restaurant = await this.publicService.getRestaurantBySlug(slug);
    console.log('🔥 PUBLIC MENU DEBUG: Found restaurant', { restaurantId: restaurant.id, restaurantName: restaurant.name });

    // CRITICAL FIX: Determine branch from table to prevent cross-branch menu contamination
    let branchId: string | undefined;
    if (tableId?.trim()) {
      // NEW APPROACH: Direct table ID lookup (globally unique)
      branchId = await this.publicService.getBranchIdFromTableId(tableId.trim());
      console.log('🔥 PUBLIC MENU DEBUG: Branch lookup result (by tableId)', { tableId: tableId.trim(), branchId });
    } else if (table?.trim()) {
      // LEGACY APPROACH: Table number lookup (needs restaurant scope)
      branchId = await this.publicService.getBranchIdFromTable(restaurant.id, table.trim());
      console.log('🔥 PUBLIC MENU DEBUG: Branch lookup result (by table)', { table: table.trim(), branchId });
    }

    // Load menu filtered by branch - this prevents Branch A customers seeing Branch B items
    const menu = await this.publicService.getMenuForRestaurant(restaurant.id, branchId);
    console.log('🔥 PUBLIC MENU DEBUG: Menu result', {
      categoriesCount: menu.categories.length,
      uncategorisedCount: menu.uncategorised.length,
      branchIdUsedForFilter: branchId
    });

    // If table is specified (either by tableId or table), check for active orders on that table
    let activeOrder = null;
    if (tableId?.trim()) {
      // NEW APPROACH: Look up active order by tableId (preferred)
      activeOrder = await this.publicService.getActiveOrderForTableId(
        restaurant.id,
        tableId.trim(),
        restaurant.slug
      );
      console.log('🔥 PUBLIC MENU DEBUG: Active order result (by tableId)', { tableId: tableId.trim(), activeOrder: !!activeOrder });
    } else if (table?.trim()) {
      // LEGACY APPROACH: Look up active order by table number
      activeOrder = await this.publicService.getActiveOrderForTable(
        restaurant.id,
        table.trim(),
        restaurant.slug
      );
      console.log('🔥 PUBLIC MENU DEBUG: Active order result (by table)', { table: table.trim(), activeOrder: !!activeOrder });
    }

    console.log('🔥 PUBLIC MENU DEBUG: Final response prepared');
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

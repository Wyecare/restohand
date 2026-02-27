import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { TillService, OpenTillDto, CloseTillDto, RecordTillTransactionDto } from './till.service';

@ApiTags('till')
@Controller('restaurants/:restaurantId/till')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TillController {
  constructor(private readonly tillService: TillService) {}

  @Post('open')
  @Roles(UserRole.Manager, UserRole.Owner, UserRole.Cashier)
  @ApiOperation({ summary: 'Open a till session for the branch' })
  async openTill(
    @Param('restaurantId') restaurantId: string,
    @Body() body: {
      branchId: string;
      openingFloat: number;
      openingNotes?: string;
    },
    @Request() req: any,
  ) {
    const dto: OpenTillDto = {
      restaurantId,
      branchId: body.branchId,
      cashierId: req.user?.userId || req.user?.id,
      cashierName: req.user?.displayName || req.user?.name || req.user?.email,
      openingFloat: body.openingFloat,
      openingNotes: body.openingNotes,
    };
    return this.tillService.openTill(dto);
  }

  @Put(':tillId/close')
  @Roles(UserRole.Manager, UserRole.Owner, UserRole.Cashier)
  @ApiOperation({ summary: 'Close a till session' })
  async closeTill(
    @Param('restaurantId') restaurantId: string,
    @Param('tillId') tillId: string,
    @Body() body: CloseTillDto,
  ) {
    return this.tillService.closeTill(tillId, body);
  }

  @Get('current')
  @Roles(UserRole.Manager, UserRole.Owner, UserRole.Cashier, UserRole.Waiter)
  @ApiOperation({ summary: 'Get the currently open till for a branch' })
  @ApiQuery({ name: 'branchId', required: true })
  async getCurrentTill(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId: string,
  ) {
    const till = await this.tillService.getCurrentTill(restaurantId, branchId);
    return till ?? null;
  }

  @Get()
  @Roles(UserRole.Manager, UserRole.Owner, UserRole.Cashier)
  @ApiOperation({ summary: 'Get till session history' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTillHistory(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tillService.getTillHistory(
      restaurantId,
      branchId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':tillId/transaction')
  @Roles(UserRole.Manager, UserRole.Owner, UserRole.Cashier)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a payment transaction on the till' })
  async recordTransaction(
    @Param('restaurantId') restaurantId: string,
    @Param('tillId') tillId: string,
    @Body() body: RecordTillTransactionDto,
  ) {
    return this.tillService.recordTransaction(tillId, body);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { OrderProgressStage } from '../../common/enums/order-progress.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ required: false })
  sessionId?: string;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty({ required: false })
  tableNumber?: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  customerPhone?: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ enum: OrderProgressStage })
  progress!: OrderProgressStage;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty()
  subTotalAmount!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  statusNote?: string;

  @ApiProperty({ required: false })
  paidAt?: string;

  @ApiProperty({ required: false })
  paymentProvider?: string;

  @ApiProperty({ required: false })
  paymentTransactionId?: string;

  @ApiProperty({ required: false })
  readyAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

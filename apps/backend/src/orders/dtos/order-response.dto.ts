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
  customerSessionId?: string;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty({ required: false })
  tableNumber?: string;

  @ApiProperty({ required: false })
  tableId?: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  customerPhone?: string;

  @ApiProperty({ required: false })
  customerEmail?: string;

  @ApiProperty({ required: false })
  customerGstin?: string;

  @ApiProperty({ required: false })
  customerState?: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ enum: ['upi', 'cash'] })
  paymentMethod!: 'upi' | 'cash';

  @ApiProperty({ enum: OrderProgressStage })
  progress!: OrderProgressStage;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty()
  subTotalAmount!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  cgstAmount!: number;

  @ApiProperty()
  sgstAmount!: number;

  @ApiProperty()
  igstAmount!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  roundOffAmount!: number;

  @ApiProperty({ required: false, enum: ['intra-state', 'inter-state'] })
  taxType?: 'intra-state' | 'inter-state';

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
  razorpayOrderId?: string;

  @ApiProperty({ required: false, type: Object })
  paymentMeta?: Record<string, unknown>;

  @ApiProperty({ required: false })
  readyAt?: string;

  @ApiProperty({ required: false })
  paymentIntentUrl?: string;

  @ApiProperty({ required: false })
  taxInvoiceNumber?: string;

  @ApiProperty({ required: false })
  taxInvoiceGeneratedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
  billGeneratedAt: any;
  subtotal: any;
}

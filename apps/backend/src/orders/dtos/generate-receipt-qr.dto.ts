import { ApiProperty } from '@nestjs/swagger';

export class GenerateReceiptQrDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Order ID',
  })
  orderId!: string;

  @ApiProperty({
    example: 'ORD-2024-001',
    description: 'Order number',
  })
  orderNumber!: string;

  @ApiProperty({
    example: 'https://qr.restohand.com/receipt/507f1f77bcf86cd799439011?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Receipt URL for customers',
  })
  receiptUrl!: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: 'QR code data URL (base64 encoded image)',
  })
  qrCodeDataUrl!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT token for receipt access',
  })
  token!: string;

  @ApiProperty({
    example: '2024-02-15T10:30:00.000Z',
    description: 'Token expiration date',
  })
  expiresAt!: Date;
}
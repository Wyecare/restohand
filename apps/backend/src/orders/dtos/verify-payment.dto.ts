import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Razorpay payment ID returned by checkout',
    example: 'pay_29QQoUBi66xm2f'
  })
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @ApiProperty({
    description: 'Razorpay order ID returned by checkout',
    example: 'order_9A33XWu170gUtm'
  })
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @ApiProperty({
    description: 'Payment signature for verification',
    example: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d'
  })
  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;
}
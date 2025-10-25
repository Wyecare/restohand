import { ApiProperty } from '@nestjs/swagger';

export class OrderItemGstDto {
  @ApiProperty({ required: false })
  hsnCode?: string;

  @ApiProperty({ required: false })
  gstRateId?: string;

  @ApiProperty()
  gstRate!: number;

  @ApiProperty()
  cgstAmount!: number;

  @ApiProperty()
  sgstAmount!: number;

  @ApiProperty()
  igstAmount!: number;

  @ApiProperty()
  totalTaxAmount!: number;

  @ApiProperty()
  taxableAmount!: number;

  @ApiProperty()
  totalWithTax!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  isTaxInclusive!: boolean;
}

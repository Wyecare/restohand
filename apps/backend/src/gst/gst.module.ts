import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GstController, HsnCodeController } from './gst.controller';
import { GstService } from './gst.service';
import { GstRate, GstRateSchema } from './schemas/gst-rate.schema';
import { HsnCode, HsnCodeSchema } from './schemas/hsn-code.schema';
import { TaxInvoice, TaxInvoiceSchema } from './schemas/tax-invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GstRate.name, schema: GstRateSchema },
      { name: HsnCode.name, schema: HsnCodeSchema },
      { name: TaxInvoice.name, schema: TaxInvoiceSchema },
    ]),
    AuthModule,
  ],
  controllers: [GstController, HsnCodeController],
  providers: [GstService],
  exports: [GstService],
})
export class GstModule {}
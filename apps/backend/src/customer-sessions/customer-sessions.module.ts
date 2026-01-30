import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSession, CustomerSessionSchema } from './customer-session.schema';
import { CustomerSessionsService } from './customer-sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSession.name, schema: CustomerSessionSchema },
    ]),
  ],
  providers: [CustomerSessionsService],
  exports: [CustomerSessionsService],
})
export class CustomerSessionsModule {}
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSession, CustomerSessionSchema } from './customer-session.schema';
import { SessionHistory, SessionHistorySchema } from './session-history.schema';
import { CustomerSessionsService } from './customer-sessions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSession.name, schema: CustomerSessionSchema },
      { name: SessionHistory.name, schema: SessionHistorySchema },
    ]),
  ],
  providers: [CustomerSessionsService],
  exports: [CustomerSessionsService],
})
export class CustomerSessionsModule {}
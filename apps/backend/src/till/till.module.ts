import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TillController } from './till.controller';
import { TillService } from './till.service';
import { TillSession, TillSessionSchema } from './schemas/till-session.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: TillSession.name, schema: TillSessionSchema },
    ]),
  ],
  controllers: [TillController],
  providers: [TillService],
  exports: [TillService],
})
export class TillModule {}

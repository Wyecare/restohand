import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FloorPlansService } from './floor-plans.service';
import { FloorPlansController } from './floor-plans.controller';
import { FloorPlansGateway } from './floor-plans.gateway';
import { FloorPlan, FloorPlanSchema } from './schemas/floor-plan.schema';
import { TableStatus, TableStatusSchema } from './schemas/table-status.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FloorPlan.name, schema: FloorPlanSchema },
      { name: TableStatus.name, schema: TableStatusSchema },
    ]),
    AuthModule,
  ],
  controllers: [FloorPlansController],
  providers: [FloorPlansService, FloorPlansGateway],
  exports: [FloorPlansService, FloorPlansGateway],
})
export class FloorPlansModule {}
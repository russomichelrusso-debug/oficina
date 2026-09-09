import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { ServiceOrdersController } from "./service-orders.controller";
import { ServiceOrdersService } from "./service-orders.service";

@Module({
  imports: [RealtimeModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

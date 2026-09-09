import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";

@Module({
  imports: [RealtimeModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}

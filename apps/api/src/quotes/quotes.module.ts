import { Module } from "@nestjs/common";
import { ServiceOrdersModule } from "../service-orders/service-orders.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";

@Module({
  imports: [ServiceOrdersModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}

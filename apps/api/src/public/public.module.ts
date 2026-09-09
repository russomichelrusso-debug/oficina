import { Module } from "@nestjs/common";
import { QuotesModule } from "../quotes/quotes.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [QuotesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}

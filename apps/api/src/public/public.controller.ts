import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { PublicService } from "./public.service";
import { ApproveQuoteDto } from "../quotes/dto/approve-quote.dto";

@Controller("public")
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("service-orders/:token")
  findServiceOrder(@Param("token") token: string) {
    return this.publicService.findServiceOrderByToken(token);
  }

  @Post("service-orders/:token/quotes/:quoteId/approve")
  approveQuote(
    @Param("token") token: string,
    @Param("quoteId") quoteId: string,
    @Body() dto: ApproveQuoteDto,
    @Req() req: Request,
  ) {
    return this.publicService.approveQuote(token, quoteId, dto, {
      ip: req.ip,
      device: req.headers["user-agent"],
    });
  }
}

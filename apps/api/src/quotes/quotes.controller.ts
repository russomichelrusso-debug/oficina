import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ApproveQuoteDto } from "./dto/approve-quote.dto";

@Controller("quotes")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  findAll(@Query("serviceOrderId") serviceOrderId?: string) {
    return this.quotesService.findAll(serviceOrderId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.quotesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.quotesService.send(id);
  }

  // Aprovação registrada pela recepção em nome do cliente (ex.: aprovação por telefone).
  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() dto: ApproveQuoteDto, @Req() req: Request) {
    return this.quotesService.approve(id, dto, { ip: req.ip, device: req.headers["user-agent"] });
  }
}

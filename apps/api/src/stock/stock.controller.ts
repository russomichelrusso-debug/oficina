import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { StockService } from "./stock.service";
import { CreateStockMovementDto } from "./dto/create-stock-movement.dto";

@Controller("stock-movements")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.ESTOQUE, RoleName.MECANICO)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(@Query("partId") partId?: string) {
    return this.stockService.findAll(partId);
  }

  @Post()
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockService.create(dto, user.id);
  }
}

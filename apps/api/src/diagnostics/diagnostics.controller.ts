import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { DiagnosticsService } from "./diagnostics.service";
import { CreateDiagnosticDto } from "./dto/create-diagnostic.dto";

@Controller("diagnostics")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get()
  findAll(@Query("serviceOrderId") serviceOrderId?: string) {
    return this.diagnosticsService.findAll(serviceOrderId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.diagnosticsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDiagnosticDto, @CurrentUser() user: AuthenticatedUser) {
    return this.diagnosticsService.create(dto, user.id);
  }
}

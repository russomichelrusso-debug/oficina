import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ChecklistsService } from "./checklists.service";
import { CreateChecklistDto } from "./dto/create-checklist.dto";
import { UpdateChecklistDto } from "./dto/update-checklist.dto";

@Controller("checklists")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  findAll(@Query("serviceOrderId") serviceOrderId?: string) {
    return this.checklistsService.findAll(serviceOrderId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.checklistsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateChecklistDto) {
    return this.checklistsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateChecklistDto) {
    return this.checklistsService.update(id, dto);
  }

  @Post(":id/complete")
  complete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.checklistsService.complete(id, user.id);
  }
}

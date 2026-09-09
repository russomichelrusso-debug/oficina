import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleName, ServiceOrderStatus } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ServiceOrdersService } from "./service-orders.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { ChangeStatusDto } from "./dto/change-status.dto";
import { AssignMechanicDto } from "./dto/assign-mechanic.dto";
import { AddItemDto } from "./dto/add-item.dto";

@Controller("service-orders")
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.FINANCEIRO, RoleName.ESTOQUE)
  findAll(
    @Query("status") status?: ServiceOrderStatus,
    @Query("mechanicId") mechanicId?: string,
    @Query("customerId") customerId?: string,
  ) {
    return this.serviceOrdersService.findAll({ status, mechanicId, customerId });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.serviceOrdersService.findOne(id, user);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO)
  create(@Body() dto: CreateServiceOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.serviceOrdersService.create(dto, user.id);
  }

  @Patch(":id/mechanic")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO)
  assignMechanic(@Param("id") id: string, @Body() dto: AssignMechanicDto) {
    return this.serviceOrdersService.assignMechanic(id, dto.mechanicId);
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceOrdersService.changeStatus(
      id,
      dto.status,
      dto.note,
      user,
      dto.overrideFinancialHold,
    );
  }

  @Post(":id/items")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
  addItem(@Param("id") id: string, @Body() dto: AddItemDto) {
    return this.serviceOrdersService.addItem(id, dto);
  }

  @Delete(":id/items/:itemId")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
  removeItem(@Param("id") id: string, @Param("itemId") itemId: string) {
    return this.serviceOrdersService.removeItem(id, itemId);
  }
}

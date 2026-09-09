import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { MechanicsService } from "./mechanics.service";
import { CreateMechanicDto } from "./dto/create-mechanic.dto";
import { UpdateMechanicDto } from "./dto/update-mechanic.dto";

@Controller("mechanics")
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  @Get()
  findAll() {
    return this.mechanicsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.mechanicsService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  create(@Body() dto: CreateMechanicDto) {
    return this.mechanicsService.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  update(@Param("id") id: string, @Body() dto: UpdateMechanicDto) {
    return this.mechanicsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  remove(@Param("id") id: string) {
    return this.mechanicsService.remove(id);
  }
}

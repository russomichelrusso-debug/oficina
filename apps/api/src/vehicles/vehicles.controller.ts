import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

@Controller("vehicles")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query("customerId") customerId?: string, @Query("plate") plate?: string) {
    return this.vehiclesService.findAll({ customerId, plate });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.vehiclesService.remove(id);
  }
}

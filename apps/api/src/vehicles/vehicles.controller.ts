import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { VehiclesService } from "./vehicles.service";
import { SinespService } from "./sinesp.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

@Controller("vehicles")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly sinespService: SinespService,
  ) {}

  @Get()
  findAll(@Query("customerId") customerId?: string, @Query("plate") plate?: string) {
    return this.vehiclesService.findAll({ customerId, plate });
  }

  // Precisa vir antes de ":id" para o Nest não tratar "lookup-plate" como um :id.
  @Get("lookup-plate/:plate")
  async lookupPlate(@Param("plate") plate: string) {
    const result = await this.sinespService.search(plate);
    return result ?? { plate: plate.toUpperCase(), notFound: true };
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

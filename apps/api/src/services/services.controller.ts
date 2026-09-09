import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";

@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Get("categories")
  findCategories() {
    return this.servicesService.findCategories();
  }

  @Post("categories")
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  createCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.servicesService.createCategory(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  update(@Param("id") id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE)
  remove(@Param("id") id: string) {
    return this.servicesService.remove(id);
  }
}

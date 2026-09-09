import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { PartsService } from "./parts.service";
import { CreatePartDto } from "./dto/create-part.dto";
import { UpdatePartDto } from "./dto/update-part.dto";
import { CreatePartCategoryDto } from "./dto/create-part-category.dto";

@Controller("parts")
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  findAll(@Query("search") search?: string) {
    return this.partsService.findAll(search);
  }

  @Get("low-stock")
  findLowStock() {
    return this.partsService.findLowStock();
  }

  @Get("categories")
  findCategories() {
    return this.partsService.findCategories();
  }

  @Post("categories")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.ESTOQUE)
  createCategory(@Body() dto: CreatePartCategoryDto) {
    return this.partsService.createCategory(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.partsService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.ESTOQUE)
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.ESTOQUE)
  update(@Param("id") id: string, @Body() dto: UpdatePartDto) {
    return this.partsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.ESTOQUE)
  remove(@Param("id") id: string) {
    return this.partsService.remove(id);
  }
}

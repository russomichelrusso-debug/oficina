import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { MediaService } from "./media.service";
import { CreateMediaDto } from "./dto/create-media.dto";

@Controller("media")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.RECEPCAO, RoleName.MECANICO)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(@Query("serviceOrderId") serviceOrderId?: string) {
    return this.mediaService.findAll(serviceOrderId);
  }

  @Post()
  create(@Body() dto: CreateMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.create(dto, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.mediaService.remove(id);
  }
}

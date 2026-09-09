import { Controller, Get, Param, Post, Query, Body } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { WorkSessionsService } from "./work-sessions.service";
import { StartWorkSessionDto } from "./dto/start-work-session.dto";

@Controller("work-sessions")
export class WorkSessionsController {
  constructor(private readonly workSessionsService: WorkSessionsService) {}

  @Get()
  findAll(
    @Query("serviceOrderId") serviceOrderId?: string,
    @Query("mechanicId") mechanicId?: string,
    @Query("active") active?: string,
  ) {
    return this.workSessionsService.findAll({
      serviceOrderId,
      mechanicId,
      active: active === "true",
    });
  }

  @Post("start")
  start(@Body() dto: StartWorkSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workSessionsService.start(dto, user);
  }

  @Post(":id/finish")
  finish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workSessionsService.finish(id, user);
  }
}

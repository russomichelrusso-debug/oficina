import { Controller, Get, Query } from "@nestjs/common";
import { RoleName } from "@oficina/types";
import { Roles } from "../common/decorators/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@Roles(RoleName.ADMIN, RoleName.GERENTE, RoleName.FINANCEIRO)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("productivity")
  productivity(@Query("from") from: string, @Query("to") to: string) {
    return this.reportsService.productivityByMechanic(from, to);
  }

  @Get("average-time")
  averageTime() {
    return this.reportsService.averageTimeByService();
  }

  @Get("delivery-forecast")
  deliveryForecast() {
    return this.reportsService.deliveryForecast();
  }
}

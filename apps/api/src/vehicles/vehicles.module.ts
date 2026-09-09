import { Module } from "@nestjs/common";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";
import { SinespService } from "./sinesp.service";

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService, SinespService],
  exports: [VehiclesService],
})
export class VehiclesModule {}

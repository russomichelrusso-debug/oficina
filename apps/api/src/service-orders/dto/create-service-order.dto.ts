import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateServiceOrderDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @IsOptional()
  @IsString()
  complaint?: string;
}

import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateVehicleDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  plate!: string;

  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileageKm?: number;
}

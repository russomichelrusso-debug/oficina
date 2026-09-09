import { IsOptional, IsString, IsUUID } from "class-validator";

export class StartWorkSessionDto {
  @IsUUID()
  serviceOrderId!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

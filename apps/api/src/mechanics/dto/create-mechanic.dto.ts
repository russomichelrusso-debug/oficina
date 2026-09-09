import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMechanicDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

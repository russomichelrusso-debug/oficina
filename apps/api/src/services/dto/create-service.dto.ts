import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;
}

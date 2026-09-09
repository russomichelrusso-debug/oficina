import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreatePartDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

import { IsEnum, IsInt, IsOptional, IsUUID } from "class-validator";
import { StockMovementType } from "@oficina/types";

export class CreateStockMovementDto {
  @IsUUID()
  partId!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  /** Sempre positivo, exceto AJUSTE onde pode ser negativo (correção de saldo). */
  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

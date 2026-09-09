import { IsEnum, IsOptional, IsString } from "class-validator";
import { ServiceOrderStatus } from "@oficina/types";

export class ChangeStatusDto {
  @IsEnum(ServiceOrderStatus)
  status!: ServiceOrderStatus;

  @IsOptional()
  @IsString()
  note?: string;

  /** Permite entregar mesmo com contas a receber pendentes (spec §5, alçada de gerente). */
  @IsOptional()
  overrideFinancialHold?: boolean;
}

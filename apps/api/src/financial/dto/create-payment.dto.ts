import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Min } from "class-validator";
import { PaymentMethodType } from "@oficina/types";

export class CreatePaymentDto {
  @IsUUID()
  serviceOrderId!: string;

  @IsEnum(PaymentMethodType)
  method!: PaymentMethodType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentTotal?: number;
}

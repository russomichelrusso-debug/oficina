import { IsDateString, IsNumber, IsUUID, Min } from "class-validator";

export class CreateAccountReceivableDto {
  @IsUUID()
  serviceOrderId!: string;

  @IsUUID()
  customerId!: string;

  @IsDateString()
  dueDate!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

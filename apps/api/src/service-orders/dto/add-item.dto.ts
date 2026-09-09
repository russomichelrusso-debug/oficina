import { IsEnum, IsNumber, IsString, IsUUID, Min, MinLength } from "class-validator";

export class AddItemDto {
  @IsEnum(["SERVICE", "PART"])
  type!: "SERVICE" | "PART";

  @IsUUID()
  referenceId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

import { IsArray, IsString, IsUUID } from "class-validator";

export class CreateChecklistDto {
  @IsUUID()
  serviceOrderId!: string;

  @IsString()
  templateName!: string;

  @IsArray()
  items!: Array<{ label: string; checked: boolean; note?: string }>;
}

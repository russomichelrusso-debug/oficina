import { IsArray, IsOptional } from "class-validator";

export class UpdateChecklistDto {
  @IsOptional()
  @IsArray()
  items?: Array<{ label: string; checked: boolean; note?: string }>;
}

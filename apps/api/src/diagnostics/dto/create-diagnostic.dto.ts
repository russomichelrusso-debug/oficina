import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

export class DiagnosticItemInputDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;
}

export class CreateDiagnosticDto {
  @IsUUID()
  serviceOrderId!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => DiagnosticItemInputDto)
  items!: DiagnosticItemInputDto[];
}

import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { MediaStage, MediaType } from "@oficina/types";

export class CreateMediaDto {
  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsEnum(MediaType)
  type!: MediaType;

  @IsEnum(MediaStage)
  stage!: MediaStage;

  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  /** Conteúdo do arquivo em base64 (sem o prefixo data:...;base64,). */
  @IsString()
  dataBase64!: string;
}

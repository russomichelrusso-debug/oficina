import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

/** Itens vazios = recusa total (spec §6.1: aprovar total, recusar ou aprovar parcialmente). */
export class ApproveQuoteDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  approvedItemIds?: string[];

  @IsOptional()
  @IsString()
  signatureHash?: string;
}

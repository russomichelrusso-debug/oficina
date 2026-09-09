import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";
import { RoleName } from "@oficina/types";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  roles?: RoleName[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

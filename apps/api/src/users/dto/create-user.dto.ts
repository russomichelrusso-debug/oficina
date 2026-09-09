import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { RoleName } from "@oficina/types";

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  roles!: RoleName[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

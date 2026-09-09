import { IsString, MinLength } from "class-validator";

export class CreateServiceCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

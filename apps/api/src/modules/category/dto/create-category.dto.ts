import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

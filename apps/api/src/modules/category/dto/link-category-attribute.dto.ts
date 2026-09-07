import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class LinkCategoryAttributeDto {
  @IsString()
  @MinLength(1)
  attributeId!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  searchable?: boolean;

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  matchable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

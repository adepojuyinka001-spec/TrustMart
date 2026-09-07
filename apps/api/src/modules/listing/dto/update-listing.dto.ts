import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { ListingCondition } from "@prisma/client";
import { AttributeValueDto } from "./attribute-value.dto";

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  attributeValues?: AttributeValueDto[];
}

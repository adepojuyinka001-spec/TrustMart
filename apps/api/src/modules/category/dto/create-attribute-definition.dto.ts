import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { AttributeDataType } from "@prisma/client";

export class AttributeOptionDto {
  @IsString()
  @MinLength(1)
  value!: string;

  @IsString()
  @MinLength(1)
  label!: string;
}

export class CreateAttributeDefinitionDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsEnum(AttributeDataType)
  dataType!: AttributeDataType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOptionDto)
  options?: AttributeOptionDto[];
}

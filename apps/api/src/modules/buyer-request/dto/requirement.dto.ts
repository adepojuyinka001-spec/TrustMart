import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { RequirementOperator, RequirementType } from "@prisma/client";

export class RequirementDto {
  @IsString()
  @MinLength(1)
  attributeId!: string;

  @IsEnum(RequirementOperator)
  operator!: RequirementOperator;

  @IsString()
  value!: string;

  @IsEnum(RequirementType)
  requirementType!: RequirementType;

  @IsOptional()
  @IsNumber()
  weightOverride?: number;
}

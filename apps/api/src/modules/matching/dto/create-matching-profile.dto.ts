import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";

export class MatchingCriterionDto {
  @IsString()
  @MinLength(1)
  attributeId!: string;

  @IsNumber()
  defaultWeight!: number;
}

export class CreateMatchingProfileDto {
  @IsString()
  @MinLength(1)
  subcategoryId!: string;

  @IsOptional()
  @IsNumber()
  thresholdOverridePercent?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchingCriterionDto)
  criteria!: MatchingCriterionDto[];
}

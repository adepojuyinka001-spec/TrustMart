import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { RequirementDto } from "./requirement.dto";

export class CreateBuyerRequestDto {
  @IsString()
  @MinLength(1)
  subcategoryId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minBudgetMinorUnits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudgetMinorUnits?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timelineDays?: number;

  @IsOptional()
  @IsBoolean()
  budgetFlexible?: boolean;

  @IsOptional()
  @IsBoolean()
  locationFlexible?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementDto)
  requirements?: RequirementDto[];
}

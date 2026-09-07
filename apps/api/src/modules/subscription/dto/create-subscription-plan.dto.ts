import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { BillingPeriod } from "@prisma/client";
import { EntitlementDto } from "./entitlement.dto";

export class CreateSubscriptionPlanDto {
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
  priceMinorUnits?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementDto)
  entitlements?: EntitlementDto[];
}

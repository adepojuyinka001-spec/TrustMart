import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { EscrowFeeAllocation } from "@prisma/client";

export class ProposeAmendmentDto {
  @IsInt()
  @Min(1)
  transactionAmountMinorUnits!: number;

  @IsEnum(EscrowFeeAllocation)
  feeAllocation!: EscrowFeeAllocation;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  buyerFeeSharePercent?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

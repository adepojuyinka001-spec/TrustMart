import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { EscrowFeeAllocation } from "@prisma/client";

// Prefill from a Lead (CLAUDE.md SS4/SS9: "Secure This Deal With TrustMart Escrow").
// transactionAmountMinorUnits defaults to the listing's current asking price if omitted —
// still just a DRAFT default, never binding until both parties accept (see EscrowService).
export class CreateEscrowFromLeadDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  transactionAmountMinorUnits?: number;

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

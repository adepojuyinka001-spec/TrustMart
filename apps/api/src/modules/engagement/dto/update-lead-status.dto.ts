import { IsEnum, IsOptional, IsString } from "class-validator";
import { LeadStatus } from "@prisma/client";

// SPAM_FRAUD is deliberately excluded — reachable only through LeadService.moderate(),
// a separately-permissioned action (CLAUDE.md SS11: "SPAM_FRAUD must use a controlled
// moderation/risk process").
const SELLER_SETTABLE_STATUSES = [
  LeadStatus.VIEWED,
  LeadStatus.CONTACTED,
  LeadStatus.INSPECTION_SCHEDULED,
  LeadStatus.NEGOTIATING,
  LeadStatus.TRANSACTION_STARTED,
  LeadStatus.WON,
  LeadStatus.LOST,
] as const;

export type SellerSettableLeadStatus = (typeof SELLER_SETTABLE_STATUSES)[number];

export class UpdateLeadStatusDto {
  @IsEnum(SELLER_SETTABLE_STATUSES)
  status!: SellerSettableLeadStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

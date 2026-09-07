import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

// Price, currency, billing period, and key are intentionally not editable here — changing
// them on an existing plan would retroactively affect anyone already on it. Create a new
// plan (and deactivate the old one) instead, the same pattern MatchingProfile uses.
export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

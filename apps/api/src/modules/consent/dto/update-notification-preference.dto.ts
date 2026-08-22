import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}

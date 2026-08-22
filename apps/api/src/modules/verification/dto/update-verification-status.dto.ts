import { IsEnum, IsOptional, IsString } from "class-validator";
import { VerificationStatus } from "@prisma/client";

export class UpdateVerificationStatusDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

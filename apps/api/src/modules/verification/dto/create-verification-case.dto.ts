import { IsEnum, IsOptional, IsString } from "class-validator";
import { VerificationSubjectType } from "@prisma/client";

export class CreateVerificationCaseDto {
  @IsEnum(VerificationSubjectType)
  subjectType!: VerificationSubjectType;

  @IsOptional()
  @IsString()
  businessId?: string;
}

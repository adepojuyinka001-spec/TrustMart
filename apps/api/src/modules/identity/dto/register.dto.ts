import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  // Unknown/invalid codes fall back to Company Referral rather than rejecting
  // registration (CLAUDE.md SS19) — never a hard validation failure.
  @IsOptional()
  @IsString()
  referralCode?: string;
}

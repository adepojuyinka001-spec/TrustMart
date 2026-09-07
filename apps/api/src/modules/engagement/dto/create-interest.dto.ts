import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateInterestDto {
  @IsString()
  @MinLength(1)
  listingId!: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

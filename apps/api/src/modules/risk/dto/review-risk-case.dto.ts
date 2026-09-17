import { IsIn, IsOptional, IsString } from "class-validator";

export class ReviewRiskCaseDto {
  @IsIn(["DISMISSED", "ACTIONED"])
  status!: "DISMISSED" | "ACTIONED";

  @IsOptional()
  @IsString()
  notes?: string;
}

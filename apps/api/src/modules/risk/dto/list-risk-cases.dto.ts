import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { RiskCaseStatus } from "@prisma/client";

export class ListRiskCasesDto {
  @IsOptional()
  @IsEnum(RiskCaseStatus)
  status?: RiskCaseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}

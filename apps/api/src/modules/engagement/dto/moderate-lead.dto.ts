import { IsString, MinLength } from "class-validator";

export class ModerateLeadDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}

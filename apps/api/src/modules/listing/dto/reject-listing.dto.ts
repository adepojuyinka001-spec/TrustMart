import { IsString, MinLength } from "class-validator";

export class RejectListingDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}

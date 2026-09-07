import { IsString, MinLength } from "class-validator";

export class CancelEscrowDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}

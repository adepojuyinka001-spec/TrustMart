import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateBusinessDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

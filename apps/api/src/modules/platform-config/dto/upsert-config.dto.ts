import { IsEnum, IsOptional, IsString } from "class-validator";
import { ConfigValueType } from "@prisma/client";

export class UpsertConfigDto {
  @IsEnum(ConfigValueType)
  valueType!: ConfigValueType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

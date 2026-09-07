import { IsEnum, IsString, MinLength } from "class-validator";
import { ConfigValueType } from "@prisma/client";

export class EntitlementDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsEnum(ConfigValueType)
  valueType!: ConfigValueType;

  @IsString()
  value!: string;
}

import { IsBoolean, IsEnum } from "class-validator";
import { ConsentType } from "@prisma/client";

export class SetConsentDto {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsBoolean()
  granted!: boolean;
}

import { IsString, MinLength } from "class-validator";

export class AttributeValueDto {
  @IsString()
  @MinLength(1)
  attributeId!: string;

  @IsString()
  value!: string;
}

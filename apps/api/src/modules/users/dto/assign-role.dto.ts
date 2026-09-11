import { IsString, MinLength } from "class-validator";

export class AssignRoleDto {
  @IsString()
  @MinLength(1)
  roleKey!: string;
}

import { IsOptional, IsString } from "class-validator";

export class RequestContactAccessDto {
  // Buyer's preferred channel (e.g. WHATSAPP, PHONE, EMAIL), recorded on the grant if
  // access is ever actually granted (see ContactAccessService — currently always denies;
  // see the class-level comment for why).
  @IsOptional()
  @IsString()
  preferredChannel?: string;
}

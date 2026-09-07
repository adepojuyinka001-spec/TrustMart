import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { EscrowOriginType, EscrowFeeAllocation, EscrowPartyRole } from "@prisma/client";

export class EscrowPartyInputDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsEnum(EscrowPartyRole)
  role!: EscrowPartyRole;
}

export class CreateEscrowDto {
  @IsEnum(EscrowOriginType)
  originType!: EscrowOriginType;

  @IsOptional()
  @IsString()
  originListingId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // The creator is always a party too — role is inferred from context (BUYER if they
  // didn't list themselves, since they're proposing to secure a purchase); this array
  // is for the OTHER party/parties being invited.
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EscrowPartyInputDto)
  invitedParties!: EscrowPartyInputDto[];

  @IsEnum(EscrowPartyRole)
  creatorRole!: EscrowPartyRole;

  @IsInt()
  @Min(1)
  transactionAmountMinorUnits!: number;

  @IsEnum(EscrowFeeAllocation)
  feeAllocation!: EscrowFeeAllocation;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  buyerFeeSharePercent?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

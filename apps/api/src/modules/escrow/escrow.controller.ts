import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { EscrowService } from "./escrow.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateEscrowDto } from "./dto/create-escrow.dto";
import { ProposeAmendmentDto } from "./dto/propose-amendment.dto";
import { CancelEscrowDto } from "./dto/cancel-escrow.dto";

@Controller("escrows")
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get("mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.escrowService.listMine(user.userId);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.escrowService.get(id, user.userId);
  }

  @Post()
  create(@Body() dto: CreateEscrowDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.escrowService.create(user.userId, dto, req.ip);
  }

  @Post(":id/amend")
  proposeAmendment(
    @Param("id") id: string,
    @Body() dto: ProposeAmendmentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.escrowService.proposeAmendment(id, user.userId, dto, req.ip);
  }

  @Post(":id/accept")
  accept(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.escrowService.accept(id, user.userId, req.ip);
  }

  @Post(":id/decline")
  decline(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.escrowService.decline(id, user.userId, req.ip);
  }

  @Post(":id/cancel")
  cancel(
    @Param("id") id: string,
    @Body() dto: CancelEscrowDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.escrowService.cancel(id, user.userId, dto.reason, req.ip);
  }
}

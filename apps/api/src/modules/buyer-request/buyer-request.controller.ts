import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { BuyerRequestService } from "./buyer-request.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateBuyerRequestDto } from "./dto/create-buyer-request.dto";
import { UpdateBuyerRequestDto } from "./dto/update-buyer-request.dto";

@ApiTags("Buyer Requests")
@Controller("buyer-requests")
@UseGuards(JwtAuthGuard)
export class BuyerRequestController {
  constructor(private readonly buyerRequestService: BuyerRequestService) {}

  @Get("mine")
  listMine(@CurrentUser() user: RequestUser) {
    return this.buyerRequestService.listMine(user.userId);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.buyerRequestService.get(id, user.userId);
  }

  @Post()
  create(@Body() dto: CreateBuyerRequestDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.buyerRequestService.create(user.userId, dto, req.ip);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBuyerRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.buyerRequestService.update(id, user.userId, dto, req.ip);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.buyerRequestService.activate(id, user.userId, req.ip);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.buyerRequestService.cancel(id, user.userId, req.ip);
  }
}

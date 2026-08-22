import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { BusinessService } from "./business.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { CreateBusinessDto } from "./dto/create-business.dto";

@Controller("businesses")
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBusinessDto, @Req() req: AuthenticatedRequest) {
    return this.businessService.create(user.userId, dto, req.ip);
  }

  @Get()
  listMine(@CurrentUser() user: RequestUser) {
    return this.businessService.listForUser(user.userId);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.businessService.getForUser(id, user.userId);
  }
}

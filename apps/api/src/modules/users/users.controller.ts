import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { CurrentUser } from "../identity/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../identity/authenticated-request";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getSelf(@CurrentUser() user: RequestUser) {
    return this.usersService.getSelf(user.userId);
  }

  @Patch("me/profile")
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateProfile(user.userId, dto, req.ip);
  }
}

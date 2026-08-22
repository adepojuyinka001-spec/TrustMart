import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "./authenticated-request";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: AuthenticatedRequest) {
    return this.authService.register(dto, req.ip);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(dto, req.ip);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: AuthenticatedRequest) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshDto, @CurrentUser() user: RequestUser, @Req() req: AuthenticatedRequest) {
    return this.authService.logout(dto.refreshToken, user.userId, req.ip);
  }
}

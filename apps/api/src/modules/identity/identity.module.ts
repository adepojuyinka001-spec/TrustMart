import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { LocalAuthProvider } from "./local-auth.provider";
import { AUTH_PROVIDER } from "./auth-provider.interface";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: AUTH_PROVIDER, useClass: LocalAuthProvider },
  ],
  exports: [AuthService],
})
export class IdentityModule {}

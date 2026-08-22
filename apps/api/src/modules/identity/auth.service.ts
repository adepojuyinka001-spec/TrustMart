import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { parseDurationToMs } from "../../common/duration.util";
import { AUTH_PROVIDER, type AuthProvider } from "./auth-provider.interface";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthTokens> {
    const identity = await this.authProvider.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    await this.auditService.record({
      actorId: identity.userId,
      action: "auth.register",
      resourceType: "User",
      resourceId: identity.userId,
      ipAddress,
    });

    return this.issueTokens(identity.userId, identity.email);
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    const identity = await this.authProvider.validateCredentials(dto.email, dto.password);
    if (!identity) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.auditService.record({
      actorId: identity.userId,
      action: "auth.login",
      resourceType: "User",
      resourceId: identity.userId,
      ipAddress,
    });

    return this.issueTokens(identity.userId, identity.email);
  }

  async refresh(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorId: stored.userId,
      action: "auth.refresh",
      resourceType: "User",
      resourceId: stored.userId,
      ipAddress,
    });

    return this.issueTokens(stored.userId, stored.user.email);
  }

  async logout(refreshToken: string, actorId: string, ipAddress?: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorId,
      action: "auth.logout",
      resourceType: "User",
      resourceId: actorId,
      ipAddress,
    });
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev-only-insecure-default-secret",
        expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
      },
    );

    const refreshToken = randomUUID() + randomUUID();
    const refreshTtl = process.env.JWT_REFRESH_TTL ?? "30d";
    const expiresAt = new Date(Date.now() + parseDurationToMs(refreshTtl));

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}

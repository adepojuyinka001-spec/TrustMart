import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import type { AuthProvider } from "./auth-provider.interface";
import type { PrismaService } from "../../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";

describe("AuthService", () => {
  let authProvider: jest.Mocked<AuthProvider>;
  let jwtService: JwtService;
  let prisma: { refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let auditService: jest.Mocked<AuditService>;
  let service: AuthService;

  beforeEach(() => {
    authProvider = {
      register: jest.fn(),
      validateCredentials: jest.fn(),
    };
    jwtService = new JwtService({});
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new AuthService(
      authProvider,
      jwtService,
      prisma as unknown as PrismaService,
      auditService,
    );
  });

  it("issues tokens and records an audit event on successful login (positive path)", async () => {
    authProvider.validateCredentials.mockResolvedValue({ userId: "u1", email: "buyer@example.com" });

    const tokens = await service.login({ email: "buyer@example.com", password: "correct-horse" }, "127.0.0.1");

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.login", actorId: "u1" }),
    );
  });

  it("rejects invalid credentials without issuing tokens (negative path)", async () => {
    authProvider.validateCredentials.mockResolvedValue(null);

    await expect(
      service.login({ email: "buyer@example.com", password: "wrong" }, "127.0.0.1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects an expired or unknown refresh token (negative path)", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh("unknown-token", "127.0.0.1")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

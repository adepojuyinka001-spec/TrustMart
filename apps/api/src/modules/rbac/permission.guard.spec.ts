import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionGuard } from "./permission.guard";
import { RbacService } from "./rbac.service";

function buildContext(user: { userId: string; email: string } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  let rbacService: jest.Mocked<RbacService>;
  let reflector: Reflector;
  let guard: PermissionGuard;

  beforeEach(() => {
    rbacService = { userHasPermission: jest.fn() } as unknown as jest.Mocked<RbacService>;
    reflector = new Reflector();
    guard = new PermissionGuard(reflector, rbacService);
  });

  it("allows the request through when no permission is required", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const result = await guard.canActivate(buildContext({ userId: "u1", email: "a@b.com" }));
    expect(result).toBe(true);
  });

  it("rejects unauthenticated requests when a permission is required", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("platform_config:write");
    await expect(guard.canActivate(buildContext(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a user who lacks the required permission (negative RBAC path)", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("platform_config:write");
    rbacService.userHasPermission.mockResolvedValue(false);
    await expect(
      guard.canActivate(buildContext({ userId: "buyer-1", email: "buyer@b.com" })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows a user who has the required permission (positive RBAC path)", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("platform_config:write");
    rbacService.userHasPermission.mockResolvedValue(true);
    const result = await guard.canActivate(buildContext({ userId: "admin-1", email: "admin@b.com" }));
    expect(result).toBe(true);
  });
});

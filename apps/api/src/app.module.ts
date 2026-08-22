import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./modules/audit/audit.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { UsersModule } from "./modules/users/users.module";
import { BusinessModule } from "./modules/business/business.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";
import { ConsentModule } from "./modules/consent/consent.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    RbacModule,
    IdentityModule,
    UsersModule,
    BusinessModule,
    PlatformConfigModule,
    ConsentModule,
    VerificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

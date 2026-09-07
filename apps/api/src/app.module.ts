import "./bigint-json.polyfill";
import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./modules/audit/audit.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { UsersModule } from "./modules/users/users.module";
import { BusinessModule } from "./modules/business/business.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";
import { ConsentModule } from "./modules/consent/consent.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { CategoryModule } from "./modules/category/category.module";
import { ListingModule } from "./modules/listing/listing.module";
import { BuyerRequestModule } from "./modules/buyer-request/buyer-request.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuditModule,
    RbacModule,
    IdentityModule,
    UsersModule,
    BusinessModule,
    PlatformConfigModule,
    ConsentModule,
    VerificationModule,
    CategoryModule,
    ListingModule,
    BuyerRequestModule,
    MatchingModule,
    EngagementModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

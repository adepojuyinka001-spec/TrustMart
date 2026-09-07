import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto";
import type { UpdateSubscriptionPlanDto } from "./dto/update-subscription-plan.dto";
import type { EntitlementDto } from "./dto/entitlement.dto";

// Subscription catalog only (CLAUDE.md SS12: "Plans and entitlements must not be
// hard-coded"). See the schema-level comment on SubscriptionPlan for why activation and
// payment are deliberately out of scope here (Open Decision #1 — no payment provider
// chosen yet; founder chose catalog-only for this pass, 2026-09-07).
@Injectable()
export class SubscriptionPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSubscriptionPlanDto, actorId: string, ipAddress?: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`A plan with key "${dto.key}" already exists.`);
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
        priceMinorUnits: BigInt(dto.priceMinorUnits ?? 0),
        currency: dto.currency ?? "NGN",
        billingPeriod: dto.billingPeriod,
        displayOrder: dto.displayOrder ?? 0,
        entitlements: dto.entitlements
          ? { create: dto.entitlements.map((e) => ({ key: e.key, valueType: e.valueType, value: e.value })) }
          : undefined,
      },
      include: { entitlements: true },
    });

    await this.auditService.record({
      actorId,
      action: "subscription_plan.create",
      resourceType: "SubscriptionPlan",
      resourceId: plan.id,
      afterState: plan,
      ipAddress,
    });

    return plan;
  }

  async update(planId: string, dto: UpdateSubscriptionPlanDto, actorId: string, ipAddress?: string) {
    const before = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!before) {
      throw new NotFoundException("Subscription plan not found.");
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        label: dto.label,
        description: dto.description,
        isActive: dto.isActive,
        displayOrder: dto.displayOrder,
      },
      include: { entitlements: true },
    });

    await this.auditService.record({
      actorId,
      action: "subscription_plan.update",
      resourceType: "SubscriptionPlan",
      resourceId: planId,
      beforeState: before,
      afterState: updated,
      ipAddress,
    });

    return updated;
  }

  async upsertEntitlement(planId: string, dto: EntitlementDto, actorId: string, ipAddress?: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException("Subscription plan not found.");
    }

    const before = await this.prisma.subscriptionEntitlement.findUnique({
      where: { planId_key: { planId, key: dto.key } },
    });

    const entitlement = await this.prisma.subscriptionEntitlement.upsert({
      where: { planId_key: { planId, key: dto.key } },
      update: { valueType: dto.valueType, value: dto.value },
      create: { planId, key: dto.key, valueType: dto.valueType, value: dto.value },
    });

    await this.auditService.record({
      actorId,
      action: "subscription_plan.entitlement_upsert",
      resourceType: "SubscriptionEntitlement",
      resourceId: entitlement.id,
      beforeState: before ?? undefined,
      afterState: entitlement,
      ipAddress,
    });

    return entitlement;
  }

  async listActive() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { entitlements: true },
    });
  }

  async listAll() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: "asc" },
      include: { entitlements: true },
    });
  }

  async get(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { entitlements: true },
    });
    if (!plan) {
      throw new NotFoundException("Subscription plan not found.");
    }
    return plan;
  }
}

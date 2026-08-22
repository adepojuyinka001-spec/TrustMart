import { PrismaClient, ConfigValueType } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  { key: "BUYER", label: "Buyer" },
  { key: "SELLER", label: "Seller" },
  { key: "BUSINESS_STAFF", label: "Business Staff" },
  { key: "SUPPORT", label: "Support" },
  { key: "RISK_ANALYST", label: "Risk Analyst" },
  { key: "ADMIN", label: "Administrator" },
];

const PERMISSIONS = [
  { key: "platform_config:read", label: "Read platform configuration" },
  { key: "platform_config:write", label: "Write platform configuration" },
  { key: "verification:review", label: "Review verification cases" },
  { key: "audit:read", label: "Read audit events" },
];

// ADMIN gets every permission. Other roles get none by default in Shared Core —
// later phases (Marketplace, Escrow) grant module-specific permissions to SELLER/BUYER/etc.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.key),
  RISK_ANALYST: ["verification:review", "audit:read"],
  SUPPORT: ["audit:read"],
};

// SSOT defaults — configurable, never hard-coded in module logic.
const CONFIG_DEFAULTS: Array<{
  key: string;
  valueType: ConfigValueType;
  value: string;
  description: string;
}> = [
  {
    key: "marketplace.match_threshold_percent",
    valueType: ConfigValueType.NUMBER,
    value: "70",
    description: "Initial default qualifying match threshold (SSOT SS6).",
  },
  {
    key: "marketplace.listing_lifecycle_days",
    valueType: ConfigValueType.NUMBER,
    value: "14",
    description: "Initial default listing lifecycle in days (SSOT SS6).",
  },
  {
    key: "marketplace.subscription_weekly_naira",
    valueType: ConfigValueType.NUMBER,
    value: "5000",
    description: "Initial introductory weekly seller subscription price, NGN (SSOT SS6).",
  },
  {
    key: "marketplace.subscription_monthly_naira",
    valueType: ConfigValueType.NUMBER,
    value: "15000",
    description: "Initial introductory monthly seller subscription price, NGN (SSOT SS6).",
  },
  {
    key: "escrow.fee_percent",
    valueType: ConfigValueType.NUMBER,
    value: "2.5",
    description: "Current contemplated Escrow platform fee, percent of transaction value (SSOT SS4).",
  },
];

async function main() {
  const roleByKey = new Map<string, { id: string }>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { key: role.key },
      update: { label: role.label },
      create: role,
    });
    roleByKey.set(role.key, created);
  }

  const permissionByKey = new Map<string, { id: string }>();
  for (const permission of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label },
      create: permission,
    });
    permissionByKey.set(permission.key, created);
  }

  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleByKey.get(roleKey);
    if (!role) continue;
    for (const permissionKey of permissionKeys) {
      const permission = permissionByKey.get(permissionKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  for (const config of CONFIG_DEFAULTS) {
    await prisma.platformConfiguration.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log("Shared Core seed complete: roles, permissions, and default platform configuration.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

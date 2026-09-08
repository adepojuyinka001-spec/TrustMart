import { PrismaClient, ConfigValueType, BillingPeriod, ListingStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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
  { key: "category:manage", label: "Manage categories, subcategories and attributes" },
  { key: "listing:moderate", label: "Approve or reject submitted listings" },
  { key: "listing:lifecycle_sweep", label: "Run the listing expiry/warning sweep" },
  { key: "matching:manage", label: "Manage matching profiles and weights" },
  { key: "lead:moderate", label: "Mark a lead as spam/fraud" },
  { key: "subscription:manage", label: "Manage subscription plans and entitlements" },
  { key: "analytics:read", label: "Read platform analytics/KPI overview" },
];

// ADMIN gets every permission. Other roles get none by default in Shared Core —
// later phases (Marketplace, Escrow) grant module-specific permissions to SELLER/BUYER/etc.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.key),
  RISK_ANALYST: ["verification:review", "audit:read", "lead:moderate"],
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
    key: "marketplace.listing_expiry_warning_days",
    valueType: ConfigValueType.NUMBER,
    value: "2",
    description: "Days before expiresAt that an ACTIVE listing moves to EXPIRING (CLAUDE.md SS10).",
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
  {
    key: "marketplace.match_budget_weight_percent",
    valueType: ConfigValueType.NUMBER,
    value: "25",
    description: "Default weight of the budget criterion in matching, when the buyer marks budget as flexible.",
  },
  {
    key: "marketplace.match_location_weight_percent",
    valueType: ConfigValueType.NUMBER,
    value: "25",
    description: "Default weight of the location criterion in matching, when the buyer marks location as flexible.",
  },
];

// Illustrative starter catalog matching the SSOT's initial introductory pricing —
// data, not hard-coded logic (CLAUDE.md SS12). Entitlement *meaning* is not enforced
// anywhere yet; these rows just describe what each plan is meant to unlock for whichever
// future module reads them.
const SUBSCRIPTION_PLANS: Array<{
  key: string;
  label: string;
  description: string;
  priceMinorUnits: bigint;
  billingPeriod: BillingPeriod;
  displayOrder: number;
  entitlements: Array<{ key: string; valueType: ConfigValueType; value: string }>;
}> = [
  {
    key: "FREE",
    label: "Free",
    description: "Limited access for sellers just getting started.",
    priceMinorUnits: 0n,
    billingPeriod: BillingPeriod.NONE,
    displayOrder: 0,
    entitlements: [{ key: "listing_limit", valueType: ConfigValueType.NUMBER, value: "1" }],
  },
  {
    key: "WEEKLY_SELLER",
    label: "Weekly Seller",
    description: "Initial introductory weekly plan (SSOT SS6).",
    priceMinorUnits: 500_000n, // NGN 5,000 in kobo
    billingPeriod: BillingPeriod.WEEKLY,
    displayOrder: 1,
    entitlements: [
      { key: "listing_limit", valueType: ConfigValueType.NUMBER, value: "10" },
      { key: "lead_contact_access", valueType: ConfigValueType.BOOLEAN, value: "true" },
    ],
  },
  {
    key: "MONTHLY_SELLER",
    label: "Monthly Seller",
    description: "Initial introductory monthly plan (SSOT SS6).",
    priceMinorUnits: 1_500_000n, // NGN 15,000 in kobo
    billingPeriod: BillingPeriod.MONTHLY,
    displayOrder: 2,
    entitlements: [
      { key: "listing_limit", valueType: ConfigValueType.NUMBER, value: "50" },
      { key: "lead_contact_access", valueType: ConfigValueType.BOOLEAN, value: "true" },
    ],
  },
];

// Demo/starter categories matching the SSOT rollout order (Real Estate, Vehicles first)
// so the web app has real data to browse without requiring manual admin setup first.
// Data, not hard-coded matching logic — sellers/admins can add more via the API.
const CATEGORIES = [
  {
    key: "real-estate",
    label: "Real Estate",
    subcategories: [
      {
        key: "duplex",
        label: "Duplex",
        attributes: [
          { key: "bedrooms", label: "Bedrooms", dataType: "NUMBER" as const, required: true },
          { key: "land-size-sqm", label: "Land Size (sqm)", dataType: "NUMBER" as const, required: false },
        ],
      },
      {
        key: "apartment",
        label: "Apartment",
        attributes: [{ key: "bedrooms", label: "Bedrooms", dataType: "NUMBER" as const, required: true }],
      },
    ],
  },
  {
    key: "vehicles",
    label: "Vehicles",
    subcategories: [
      {
        key: "sedan",
        label: "Sedan",
        attributes: [
          { key: "year", label: "Year", dataType: "NUMBER" as const, required: true },
          { key: "mileage-km", label: "Mileage (km)", dataType: "NUMBER" as const, required: false },
        ],
      },
    ],
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

  for (const [categoryOrder, category] of CATEGORIES.entries()) {
    const createdCategory = await prisma.category.upsert({
      where: { key: category.key },
      update: { label: category.label },
      create: { key: category.key, label: category.label, displayOrder: categoryOrder },
    });

    for (const [subOrder, subcategory] of category.subcategories.entries()) {
      const createdSubcategory = await prisma.subcategory.upsert({
        where: { categoryId_key: { categoryId: createdCategory.id, key: subcategory.key } },
        update: { label: subcategory.label },
        create: {
          categoryId: createdCategory.id,
          key: subcategory.key,
          label: subcategory.label,
          displayOrder: subOrder,
        },
      });

      for (const [attrOrder, attribute] of subcategory.attributes.entries()) {
        const createdAttribute = await prisma.attributeDefinition.upsert({
          where: { key: attribute.key },
          update: { label: attribute.label },
          create: { key: attribute.key, label: attribute.label, dataType: attribute.dataType },
        });

        await prisma.categoryAttribute.upsert({
          where: {
            subcategoryId_attributeId: { subcategoryId: createdSubcategory.id, attributeId: createdAttribute.id },
          },
          update: { required: attribute.required },
          create: {
            subcategoryId: createdSubcategory.id,
            attributeId: createdAttribute.id,
            required: attribute.required,
            displayOrder: attrOrder,
          },
        });
      }
    }
  }

  // Demo seller + a couple of real ACTIVE listings, so the Marketplace has genuine
  // browsable content out of the box instead of an empty grid. Login:
  // demo.seller@trustmart.ng / Demo12345! (dev-only; never a real credential).
  const demoPasswordHash = await bcrypt.hash("Demo12345!", 12);
  const demoSeller = await prisma.user.upsert({
    where: { email: "demo.seller@trustmart.ng" },
    update: {},
    create: {
      email: "demo.seller@trustmart.ng",
      passwordHash: demoPasswordHash,
      profile: { create: { firstName: "Demo", lastName: "Seller" } },
    },
  });

  // Demo admin, so the Admin Control Centre (CLAUDE.md SS25) has a real account to sign
  // in with instead of requiring manual role assignment. Login:
  // demo.admin@trustmart.ng / Demo12345! (dev-only; never a real credential).
  const demoAdmin = await prisma.user.upsert({
    where: { email: "demo.admin@trustmart.ng" },
    update: {},
    create: {
      email: "demo.admin@trustmart.ng",
      passwordHash: demoPasswordHash,
      profile: { create: { firstName: "Demo", lastName: "Admin" } },
    },
  });
  const adminRole = roleByKey.get("ADMIN");
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demoAdmin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: demoAdmin.id, roleId: adminRole.id },
    });
  }

  const duplexSub = await prisma.subcategory.findFirst({ where: { key: "duplex", category: { key: "real-estate" } } });
  const sedanSub = await prisma.subcategory.findFirst({ where: { key: "sedan", category: { key: "vehicles" } } });
  const bedroomsAttr = await prisma.attributeDefinition.findUnique({ where: { key: "bedrooms" } });
  const yearAttr = await prisma.attributeDefinition.findUnique({ where: { key: "year" } });

  const DEMO_LISTINGS: Array<{
    subcategoryId?: string;
    title: string;
    description: string;
    priceMinorUnits: bigint;
    city: string;
    state: string;
    attributeId?: string;
    attributeValue?: string;
  }> = [
    {
      subcategoryId: duplexSub?.id,
      title: "4 Bedroom Duplex",
      description: "Spacious fully-detached duplex with a modern finish, secure estate, 24/7 power.",
      priceMinorUnits: 12_000_000_000n, // NGN 120,000,000
      city: "Lekki Phase 1",
      state: "Lagos",
      attributeId: bedroomsAttr?.id,
      attributeValue: "4",
    },
    {
      subcategoryId: sedanSub?.id,
      title: "Toyota Camry 2020",
      description: "Foreign-used, accident-free, full option. Recently serviced.",
      priceMinorUnits: 980_000_000n, // NGN 9,800,000
      city: "Lekki",
      state: "Lagos",
      attributeId: yearAttr?.id,
      attributeValue: "2020",
    },
  ];

  for (const demo of DEMO_LISTINGS) {
    if (!demo.subcategoryId) continue;
    const existing = await prisma.listing.findFirst({ where: { title: demo.title, sellerUserId: demoSeller.id } });
    if (existing) continue;
    await prisma.listing.create({
      data: {
        sellerUserId: demoSeller.id,
        subcategoryId: demo.subcategoryId,
        title: demo.title,
        description: demo.description,
        askingPriceMinorUnits: demo.priceMinorUnits,
        currency: "NGN",
        country: "Nigeria",
        state: demo.state,
        city: demo.city,
        status: ListingStatus.ACTIVE,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        attributeValues:
          demo.attributeId && demo.attributeValue
            ? { create: [{ attributeId: demo.attributeId, value: demo.attributeValue }] }
            : undefined,
      },
    });
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { key: plan.key } });
    if (existing) continue;
    await prisma.subscriptionPlan.create({
      data: {
        key: plan.key,
        label: plan.label,
        description: plan.description,
        priceMinorUnits: plan.priceMinorUnits,
        billingPeriod: plan.billingPeriod,
        displayOrder: plan.displayOrder,
        entitlements: { create: plan.entitlements },
      },
    });
  }

  console.log(
    "Shared Core seed complete: roles, permissions, default platform configuration, demo categories, and subscription catalog.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

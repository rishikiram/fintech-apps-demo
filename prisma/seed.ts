import "dotenv/config";
import { faker } from "@faker-js/faker";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const REFUND_COUNT = 200;

const REFUND_REASONS = [
  "Item arrived damaged",
  "Wrong item shipped",
  "Order never delivered",
  "Duplicate charge",
  "Item not as described",
  "Changed my mind",
  "Subscription cancelled",
  "Accidental purchase",
  "Quality below expectations",
  "Billing error",
];

const SEED_ACTOR = {
  actorClerkId: "seed",
  actorEmail: "seed@system.local",
};

function pickStatus(): string {
  const r = Math.random();
  if (r < 0.4) return "PENDING";
  if (r < 0.55) return "FLAGGED";
  if (r < 0.8) return "APPROVED";
  return "REJECTED";
}

async function seedRefunds() {
  const refunds = Array.from({ length: REFUND_COUNT }, () => {
    const status = pickStatus();
    const decided = status === "APPROVED" || status === "REJECTED";
    const createdAt = faker.date.between({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
    return {
      orderId: `ORD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
      customerName: faker.person.fullName(),
      customerEmail: faker.internet.email().toLowerCase(),
      amountCents: faker.number.int({ min: 199, max: 250_000 }),
      currency: "USD",
      reason: faker.helpers.arrayElement(REFUND_REASONS),
      status,
      decidedByClerkId: decided ? SEED_ACTOR.actorClerkId : null,
      decidedByEmail: decided ? SEED_ACTOR.actorEmail : null,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await prisma.refund.createMany({ data: refunds });
  return prisma.refund.findMany({
    where: { status: { not: "PENDING" } },
    take: 30,
  });
}

async function seedFlags() {
  const flags = [
    { key: "new-checkout-flow", description: "Redesigned single-page checkout", state: "PERCENTAGE", rolloutPercent: 25 },
    { key: "dark-mode", description: "Dark theme across the app", state: "ON", rolloutPercent: 0 },
    { key: "ai-refund-triage", description: "Auto-classify refund requests with ML", state: "OFF", rolloutPercent: 0 },
    { key: "instant-refunds", description: "Skip manual review for refunds under $10", state: "PERCENTAGE", rolloutPercent: 10 },
    { key: "multi-currency", description: "Display prices in local currency", state: "OFF", rolloutPercent: 0 },
    { key: "new-onboarding", description: "Guided onboarding checklist for new users", state: "PERCENTAGE", rolloutPercent: 50 },
    { key: "email-digests", description: "Weekly summary emails", state: "ON", rolloutPercent: 0 },
    { key: "fraud-score-v2", description: "Second-generation fraud scoring model", state: "PERCENTAGE", rolloutPercent: 5 },
    { key: "self-serve-exports", description: "Let customers export their own data", state: "OFF", rolloutPercent: 0 },
    { key: "priority-support-widget", description: "In-app live chat for priority customers", state: "ON", rolloutPercent: 0 },
  ].map((f) => ({
    ...f,
    updatedByClerkId: SEED_ACTOR.actorClerkId,
    updatedByEmail: SEED_ACTOR.actorEmail,
  }));
  await prisma.featureFlag.createMany({ data: flags });
  return prisma.featureFlag.findMany();
}

async function seedAuditLogs(
  decidedRefunds: { id: string; status: string; orderId: string }[],
  flags: { id: string; key: string; state: string; rolloutPercent: number }[],
) {
  const refundEntries = decidedRefunds.map((r) => ({
    ...SEED_ACTOR,
    action: r.status === "FLAGGED" ? "refund.flag" : r.status === "APPROVED" ? "refund.approve" : "refund.reject",
    entityType: "refund",
    entityId: r.id,
    before: JSON.stringify({ orderId: r.orderId, status: "PENDING" }),
    after: JSON.stringify({ orderId: r.orderId, status: r.status }),
    createdAt: faker.date.recent({ days: 30 }),
  }));

  const flagEntries = flags.slice(0, 5).map((f) => ({
    ...SEED_ACTOR,
    action: "flag.update",
    entityType: "feature_flag",
    entityId: f.id,
    before: JSON.stringify({ key: f.key, state: "OFF", rolloutPercent: 0 }),
    after: JSON.stringify({ key: f.key, state: f.state, rolloutPercent: f.rolloutPercent }),
    createdAt: faker.date.recent({ days: 30 }),
  }));

  await prisma.auditLog.createMany({ data: [...refundEntries, ...flagEntries] });
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.featureFlag.deleteMany();

  const decidedRefunds = await seedRefunds();
  const flags = await seedFlags();
  await seedAuditLogs(decidedRefunds, flags);

  const counts = {
    refunds: await prisma.refund.count(),
    featureFlags: await prisma.featureFlag.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

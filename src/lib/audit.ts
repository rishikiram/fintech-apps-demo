import { prisma } from "@/lib/db";

type AuditEntry = {
  actorClerkId: string;
  actorEmail: string;
  action: string;
  entityType: "refund" | "feature_flag" | "auth";
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function audit(entry: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      actorClerkId: entry.actorClerkId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    },
  });
}

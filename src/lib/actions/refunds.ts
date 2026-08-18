"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const inputSchema = z.object({
  refundId: z.string().min(1),
  action: z.enum(["flag", "approve", "reject"]),
});

const allowedTransitions: Record<string, string[]> = {
  flag: ["PENDING"],
  approve: ["PENDING", "FLAGGED"],
  reject: ["PENDING", "FLAGGED"],
};

const nextStatus: Record<string, string> = {
  flag: "FLAGGED",
  approve: "APPROVED",
  reject: "REJECTED",
};

export type RefundActionResult = { ok: true } | { ok: false; error: string };

export async function refundAction(
  formData: FormData
): Promise<RefundActionResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const role = user.publicMetadata?.role === "admin" ? "admin" : "viewer";

  const parsed = inputSchema.safeParse({
    refundId: formData.get("refundId"),
    action: formData.get("action"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }
  const { refundId, action } = parsed.data;

  if (role !== "admin" && action !== "flag") {
    return { ok: false, error: "Only admins can approve or reject refunds." };
  }

  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) {
    return { ok: false, error: "Refund not found." };
  }
  if (!allowedTransitions[action].includes(refund.status)) {
    return {
      ok: false,
      error: `Cannot ${action} a refund with status ${refund.status}.`,
    };
  }

  const email = user.emailAddresses[0]?.emailAddress ?? user.id;
  const isDecision = action === "approve" || action === "reject";

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: nextStatus[action],
      ...(isDecision
        ? { decidedByClerkId: user.id, decidedByEmail: email }
        : {}),
    },
  });

  await audit({
    actorClerkId: user.id,
    actorEmail: email,
    action: `refund.${action}`,
    entityType: "refund",
    entityId: refund.id,
    before: { status: refund.status },
    after: { status: updated.status },
  });

  revalidatePath("/refunds");
  return { ok: true };
}

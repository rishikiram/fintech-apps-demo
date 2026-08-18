"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const inputSchema = z
  .object({
    flagId: z.string().min(1),
    state: z.enum(["OFF", "ON", "PERCENTAGE"]),
    rolloutPercent: z.coerce.number().int().min(0).max(100),
  })
  .refine((data) => data.state === "PERCENTAGE" || data.rolloutPercent === 0, {
    message: "Rollout percent only applies to percentage rollouts.",
  });

export type FlagActionResult = { ok: true } | { ok: false; error: string };

export async function updateFlagAction(
  formData: FormData
): Promise<FlagActionResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  if (user.publicMetadata?.role !== "admin") {
    return { ok: false, error: "Only admins can update feature flags." };
  }

  const parsed = inputSchema.safeParse({
    flagId: formData.get("flagId"),
    state: formData.get("state"),
    rolloutPercent: formData.get("rolloutPercent") ?? 0,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }
  const { flagId, state, rolloutPercent } = parsed.data;

  const flag = await prisma.featureFlag.findUnique({ where: { id: flagId } });
  if (!flag) {
    return { ok: false, error: "Feature flag not found." };
  }
  if (flag.state === state && flag.rolloutPercent === rolloutPercent) {
    return { ok: true };
  }

  const email = user.emailAddresses[0]?.emailAddress ?? user.id;

  const updated = await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      state,
      rolloutPercent,
      updatedByClerkId: user.id,
      updatedByEmail: email,
    },
  });

  await audit({
    actorClerkId: user.id,
    actorEmail: email,
    action: "flag.update",
    entityType: "feature_flag",
    entityId: flag.id,
    before: { state: flag.state, rolloutPercent: flag.rolloutPercent },
    after: { state: updated.state, rolloutPercent: updated.rolloutPercent },
  });

  revalidatePath("/flags");
  return { ok: true };
}

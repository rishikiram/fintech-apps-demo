"use client";

import { useState, useTransition } from "react";
import { refundAction } from "@/lib/actions/refunds";

const buttonStyles: Record<string, string> = {
  flag: "border-amber-300 text-amber-700 hover:bg-amber-50",
  approve: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  reject: "border-red-300 text-red-700 hover:bg-red-50",
};

export function RefundActions({
  refundId,
  status,
  isAdmin,
}: {
  refundId: string;
  status: string;
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions: string[] = [];
  if (status === "PENDING") actions.push("flag");
  if (isAdmin && (status === "PENDING" || status === "FLAGGED")) {
    actions.push("approve", "reject");
  }

  if (actions.length === 0) {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  function run(action: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("refundId", refundId);
      formData.set("action", action);
      const result = await refundAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1.5">
        {actions.map((action) => (
          <button
            key={action}
            onClick={() => run(action)}
            disabled={isPending}
            className={`rounded border px-2 py-0.5 text-xs font-medium capitalize disabled:opacity-50 ${buttonStyles[action]}`}
          >
            {action}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

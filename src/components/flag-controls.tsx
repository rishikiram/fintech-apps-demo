"use client";

import { useState, useTransition } from "react";
import { updateFlagAction } from "@/lib/actions/flags";

type FlagState = "OFF" | "ON" | "PERCENTAGE";

const STATES: { value: FlagState; label: string }[] = [
  { value: "OFF", label: "Off" },
  { value: "ON", label: "On" },
  { value: "PERCENTAGE", label: "% Rollout" },
];

export function FlagControls({
  flagId,
  initialState,
  initialPercent,
}: {
  flagId: string;
  initialState: string;
  initialPercent: number;
}) {
  const [state, setState] = useState<FlagState>(initialState as FlagState);
  const [percent, setPercent] = useState(initialPercent);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty =
    state !== initialState ||
    (state === "PERCENTAGE" && percent !== initialPercent);

  function save() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("flagId", flagId);
      formData.set("state", state);
      formData.set(
        "rolloutPercent",
        String(state === "PERCENTAGE" ? percent : 0)
      );
      const result = await updateFlagAction(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-zinc-300">
          {STATES.map((s) => (
            <button
              key={s.value}
              onClick={() => setState(s.value)}
              disabled={isPending}
              className={`px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                state === s.value
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {state === "PERCENTAGE" && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              disabled={isPending}
              onChange={(e) =>
                setPercent(
                  Math.max(0, Math.min(100, Number(e.target.value) || 0))
                )
              }
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-right text-xs tabular-nums focus:border-zinc-500 focus:outline-none"
            />
            <span className="text-xs text-zinc-500">%</span>
          </div>
        )}
        <button
          onClick={save}
          disabled={!dirty || isPending}
          className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

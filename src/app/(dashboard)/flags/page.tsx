import { FlagControls } from "@/components/flag-controls";
import { prisma } from "@/lib/db";
import { getCurrentRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

const stateBadge: Record<string, string> = {
  OFF: "bg-zinc-100 text-zinc-600",
  ON: "bg-emerald-100 text-emerald-800",
  PERCENTAGE: "bg-sky-100 text-sky-800",
};

function stateLabel(state: string, rolloutPercent: number) {
  if (state === "PERCENTAGE") return `${rolloutPercent}% on`;
  return state === "ON" ? "On" : "Off";
}

export default async function FlagsPage() {
  const role = await getCurrentRole();
  const isAdmin = role === "admin";

  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        {!isAdmin && (
          <span className="text-sm text-zinc-500">
            Read-only — only admins can change flags.
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <ul className="divide-y divide-zinc-100">
          {flags.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">
              No feature flags yet. Run <code>npm run db:seed</code> to create
              sample flags.
            </li>
          )}
          {flags.map((flag) => (
            <li
              key={flag.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {flag.key}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      stateBadge[flag.state] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {stateLabel(flag.state, flag.rolloutPercent)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-600">
                  {flag.description}
                </p>
                {flag.updatedByEmail && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Last changed by {flag.updatedByEmail}
                  </p>
                )}
              </div>
              {isAdmin && (
                <FlagControls
                  flagId={flag.id}
                  initialState={flag.state}
                  initialPercent={flag.rolloutPercent}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

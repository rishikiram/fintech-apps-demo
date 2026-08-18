import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const ENTITY_TYPES = ["ALL", "refund", "feature_flag", "auth"] as const;

const entityLabel: Record<string, string> = {
  ALL: "All",
  refund: "Refunds",
  feature_flag: "Feature Flags",
  auth: "Auth",
};

const actionBadge: Record<string, string> = {
  "refund.flag": "bg-amber-100 text-amber-800",
  "refund.approve": "bg-emerald-100 text-emerald-800",
  "refund.reject": "bg-red-100 text-red-800",
  "flag.update": "bg-sky-100 text-sky-800",
};

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSnapshot(json: string | null) {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  } catch {
    return json;
  }
}

function pageHref(entityType: string, q: string, page: number) {
  const params = new URLSearchParams();
  if (entityType !== "ALL") params.set("entityType", entityType);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; q?: string; page?: string }>;
}) {
  const role = await getCurrentRole();
  if (role !== "admin") {
    notFound();
  }

  const params = await searchParams;
  const entityType = ENTITY_TYPES.includes(
    params.entityType as (typeof ENTITY_TYPES)[number]
  )
    ? (params.entityType as string)
    : "ALL";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where = {
    ...(entityType !== "ALL" ? { entityType } : {}),
    ...(q
      ? {
          OR: [
            { actorEmail: { contains: q } },
            { action: { contains: q } },
            { entityId: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <form action="/audit" className="flex items-center gap-2">
          {entityType !== "ALL" && (
            <input type="hidden" name="entityType" value={entityType} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search actor, action, or entity ID"
            className="w-64 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ENTITY_TYPES.map((t) => (
          <Link
            key={t}
            href={pageHref(t, q, 1)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              t === entityType
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {entityLabel[t]}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Entity</th>
              <th className="px-4 py-2.5 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const before = formatSnapshot(entry.before);
              const after = formatSnapshot(entry.after);
              return (
                <tr
                  key={entry.id}
                  className="border-b border-zinc-100 align-top last:border-0"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">{entry.actorEmail}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        actionBadge[entry.action] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs text-zinc-500">
                      {entityLabel[entry.entityType] ?? entry.entityType}
                    </div>
                    <div className="font-mono text-xs">{entry.entityId}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-600">
                    {before || after ? (
                      <div className="flex flex-col gap-0.5">
                        {before && <span>from: {before}</span>}
                        {after && <span>to: {after}</span>}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
        <span>
          {total} entr{total === 1 ? "y" : "ies"}
          {entityType !== "ALL" || q ? " (filtered)" : ""}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(entityType, q, page - 1)}
              className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-3 py-1 text-zinc-300">
              Previous
            </span>
          )}
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(entityType, q, page + 1)}
              className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-3 py-1 text-zinc-300">
              Next
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

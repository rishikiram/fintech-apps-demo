import Link from "next/link";
import { RefundActions } from "@/components/refund-actions";
import { prisma } from "@/lib/db";
import { getCurrentRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUSES = ["ALL", "PENDING", "FLAGGED", "APPROVED", "REJECTED"] as const;

const statusBadge: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-700",
  FLAGGED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountCents / 100
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function pageHref(status: string, q: string, page: number) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/refunds?${qs}` : "/refunds";
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const role = await getCurrentRole();
  const isAdmin = role === "admin";

  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as string)
    : "ALL";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderId: { contains: q } },
            { customerName: { contains: q } },
            { customerEmail: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, refunds] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
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
        <h1 className="text-xl font-semibold">Refunds</h1>
        <form action="/refunds" className="flex items-center gap-2">
          {status !== "ALL" && (
            <input type="hidden" name="status" value={status} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search order, name, or email"
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
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={pageHref(s, q, 1)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              s === status
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Reason</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Requested</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No refunds match the current filters.
                </td>
              </tr>
            )}
            {refunds.map((refund) => (
              <tr
                key={refund.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-4 py-2.5 font-mono text-xs">
                  {refund.orderId}
                </td>
                <td className="px-4 py-2.5">
                  <div>{refund.customerName}</div>
                  <div className="text-xs text-zinc-500">
                    {refund.customerEmail}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatAmount(refund.amountCents, refund.currency)}
                </td>
                <td className="max-w-48 px-4 py-2.5 text-zinc-600">
                  {refund.reason}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      statusBadge[refund.status] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {refund.status}
                  </span>
                  {refund.decidedByEmail && (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      by {refund.decidedByEmail}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
                  {formatDate(refund.createdAt)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RefundActions
                    refundId={refund.id}
                    status={refund.status}
                    isAdmin={isAdmin}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
        <span>
          {total} refund{total === 1 ? "" : "s"}
          {status !== "ALL" || q ? " (filtered)" : ""}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(status, q, page - 1)}
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
              href={pageHref(status, q, page + 1)}
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

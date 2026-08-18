import { notFound } from "next/navigation";
import { getCurrentRole } from "@/lib/roles";

export default async function AuditPage() {
  const role = await getCurrentRole();
  if (role !== "admin") {
    notFound();
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">Audit Log</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Audit log viewer coming soon. All actions taken on refunds and feature
        flags will be recorded and viewable here.
      </p>
    </section>
  );
}

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import ApprovalConsole from "@/components/approval-console";
import { getDb } from "@/db";
import { approvalAuditLogs, approvalRequests } from "@/db/schema";
import { approvalTypes, type ApprovalStatus } from "@/lib/approval";
import { signOut } from "@/app/sign-in/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let actor;
  try {
    actor = await requireUser();
  } catch (error) {
    redirect(error instanceof Error && error.message === "FORBIDDEN" ? "/unauthorized" : "/sign-in");
  }

  const db = getDb();
  const [approvalRows, auditRows] = await Promise.all([
    db.select().from(approvalRequests).where(eq(approvalRequests.status, "pending")).orderBy(desc(approvalRequests.updatedAt)),
    db.select().from(approvalAuditLogs).orderBy(desc(approvalAuditLogs.createdAt)).limit(40),
  ]);
  const initialApprovals = approvalRows.map((item) => ({
    ...item,
    requestType: item.requestType as keyof typeof approvalTypes,
    status: item.status as ApprovalStatus,
    createdAt: item.createdAt.toISOString(),
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  }));
  const initialAudit = auditRows.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SANGCHAI FINANCE CONTROL</p>
          <h1>ศูนย์อนุมัติและตรวจสอบ</h1>
        </div>
        <div className="user-area">
          <div><strong>{actor.email}</strong><span>{actor.role.toUpperCase()}</span></div>
          <form action={signOut}><button className="logout-button" type="submit">ออกจากระบบ</button></form>
        </div>
      </header>
      <ApprovalConsole role={actor.role} initialApprovals={initialApprovals} initialAudit={initialAudit} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import ApprovalConsole from "@/components/approval-console";
import { getDb } from "@/db";
import { approvalAuditLogs, approvalRequests } from "@/db/schema";
import { approvalTypes, type ApprovalStatus } from "@/lib/approval";
import { signOut } from "@/app/sign-in/actions";
import Link from "next/link";
import Image from "next/image";

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
    <div className="control-layout">
      <aside className="control-nav">
        <div className="control-brand"><Image src="/sangchai-logo.jpeg" alt="แสงชัยพาณิชย์" width={80} height={52}/><div><b>FINANCE</b><small>CONTROL CENTER</small></div></div>
        <nav aria-label="เมนูระบบหลังบ้าน">
          <span>เมนูหลัก</span>
          <Link href="/"><i>◫</i><b>Dashboard</b></Link>
          <Link className="active" href="/admin" aria-current="page"><i>✓</i><b>ศูนย์อนุมัติ</b></Link>
          <Link href="/files"><i>⇧</i><b>คลังไฟล์</b></Link>
        </nav>
        <div className="control-user"><small>เข้าสู่ระบบโดย</small><strong>{actor.email}</strong><span>{actor.role.toUpperCase()}</span><form action={signOut}><button type="submit">ออกจากระบบ</button></form></div>
      </aside>
      <main className="admin-shell">
        <header className="topbar">
          <div><p className="eyebrow">SANGCHAI FINANCE CONTROL</p><h1>ศูนย์อนุมัติและตรวจสอบ</h1></div>
          <div className="user-area"><div><strong>{actor.email}</strong><span>{actor.role.toUpperCase()}</span></div></div>
        </header>
        <ApprovalConsole role={actor.role} initialApprovals={initialApprovals} initialAudit={initialAudit} />
      </main>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvalAuditLogs, approvalRequests } from "@/db/schema";
import { requireApprover } from "@/lib/access";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApprover();
    const { id } = await params;
    const body = await request.json();
    if (!['approved', 'rejected', 'pending'].includes(body.status)) {
      return Response.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
    if (body.status === "rejected" && !String(body.note ?? "").trim()) {
      return Response.json({ error: "การไม่อนุมัติต้องระบุเหตุผล" }, { status: 400 });
    }
    const db = getDb();
    const [before] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
    if (!before) return Response.json({ error: "ไม่พบรายการ" }, { status: 404 });
    const [updated] = await db.update(approvalRequests).set({
      status: body.status,
      reviewNote: String(body.note ?? "").trim(),
      reviewedBy: actor.email,
      reviewedAt: body.status === "pending" ? null : new Date(),
      updatedAt: new Date(),
    }).where(eq(approvalRequests.id, id)).returning();
    await db.insert(approvalAuditLogs).values({
      approvalId: id,
      action: body.status,
      actorEmail: actor.email,
      note: String(body.note ?? "").trim(),
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(updated),
    });
    return Response.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvalAuditLogs, approvalRequests } from "@/db/schema";
import { requireApprover, requireUser } from "@/lib/access";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const status = new URL(request.url).searchParams.get("status");
    const db = getDb();
    const approvals = status && status !== "all"
      ? await db.select().from(approvalRequests).where(eq(approvalRequests.status, status)).orderBy(desc(approvalRequests.updatedAt))
      : await db.select().from(approvalRequests).orderBy(desc(approvalRequests.updatedAt));
    const audit = await db.select().from(approvalAuditLogs).orderBy(desc(approvalAuditLogs.createdAt)).limit(40);
    return Response.json({ approvals, audit });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApprover();
    const body = await request.json();
    if (!body.title || !body.requestType || !body.entityId) {
      return Response.json({ error: "กรุณากรอกหัวข้อ ประเภท และรหัสอ้างอิง" }, { status: 400 });
    }
    const amount = Number(body.amountBaht ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      return Response.json({ error: "ยอดเงินไม่ถูกต้อง" }, { status: 400 });
    }
    const [created] = await getDb().insert(approvalRequests).values({
      title: String(body.title).trim(),
      requestType: String(body.requestType),
      entityId: String(body.entityId).trim(),
      description: String(body.description ?? "").trim(),
      bank: String(body.bank ?? "ทุกธนาคาร"),
      priority: body.priority === "high" ? "high" : "normal",
      amountSatang: Math.round(amount * 100),
      requestedBy: actor.email,
      payloadJson: JSON.stringify(body.payload ?? {}),
    }).returning();
    await getDb().insert(approvalAuditLogs).values({
      approvalId: created.id,
      action: "created",
      actorEmail: actor.email,
      afterJson: JSON.stringify(created),
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { getDb } from "../db";
import { approvalAuditLogs, approvalRequests } from "../db/schema";

const db = getDb();
const initial = [
  { requestType: "reconciliation", title: "ยืนยันผลกระทบยอด BBL", description: "ตรวจสอบส่วนต่างและเอกสารประกอบก่อนปิดงวด", bank: "BBL", entityId: "BBL-RECON-2569-06", amountSatang: 0, priority: "high", requestedBy: "system@sangchai.local" },
  { requestType: "vendor", title: "ยืนยันบัญชีคู่ค้ารายใหม่", description: "ตรวจชื่อเจ้าของบัญชีและเลขบัญชีก่อนเพิ่มเข้าฐานคู่ค้า", bank: "KBANK", entityId: "VENDOR-PENDING-001", amountSatang: 0, priority: "normal", requestedBy: "system@sangchai.local" },
  { requestType: "anomaly", title: "ตรวจรายการถอนเงินสดมูลค่าสูง", description: "แนบใบถอนและชื่อผู้ทำรายการก่อนอนุมัติ", bank: "KTB", entityId: "KTB-CASH-001", amountSatang: 50000000, priority: "high", requestedBy: "system@sangchai.local" },
];

for (const item of initial) {
  const [created] = await db.insert(approvalRequests).values(item).returning();
  await db.insert(approvalAuditLogs).values({ approvalId: created.id, action: "created", actorEmail: item.requestedBy, afterJson: JSON.stringify(created) });
}

console.log(`Seeded ${initial.length} approval requests.`);

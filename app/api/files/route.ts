import { env } from "cloudflare:workers";

const seedFiles = [
  ["seed-kbank", "kbank 0169-0669 00023 สรุป.pdf", "KBANK", "ม.ค.–มิ.ย. 2569", "2026-01-01", "2026-06-30", "application/pdf"],
  ["seed-bbl", "bbl 0169-0669.pdf", "BBL", "ม.ค.–มิ.ย. 2569", "2026-01-01", "2026-06-30", "application/pdf"],
  ["seed-ktb-pdf", "ktb 0169-0669 0503508000023สรุป.pdf", "KTB", "ม.ค.–มิ.ย. 2569", "2026-01-01", "2026-06-30", "application/pdf"],
  ["seed-ktb-xls", "Historical_SSKBA04973.xls", "KTB", "ม.ค.–มิ.ย. 2569", "2026-01-01", "2026-06-30", "application/vnd.ms-excel"],
  ["seed-ktb-xls-2", "Historical_SSKBA04973_XXX-X-XX125-8_20260803 2.xls", "KTB", "ม.ค.–มิ.ย. 2569", "2026-01-01", "2026-06-30", "application/vnd.ms-excel"],
  ["seed-kbank-july", "KBNAK 0769 00023.pdf", "KBANK", "ก.ค. 2569", "2026-07-01", "2026-07-31", "application/pdf"],
  ["seed-bbl-july", "BBL0769.pdf", "BBL", "ก.ค. 2569", "2026-07-01", "2026-07-31", "application/pdf"],
  ["seed-ktb-july", "KTB 0769 0503508000023.xls", "KTB", "ก.ค. 2569", "2026-07-01", "2026-07-31", "application/vnd.ms-excel"],
  ["seed-bbl-august", "BBL 0869.pdf", "BBL", "ส.ค. 2569", "2026-08-01", "2026-08-31", "application/pdf"],
  ["seed-kbank-august", "KBANK 0869 00023.pdf", "KBANK", "ส.ค. 2569", "2026-08-01", "2026-08-31", "application/pdf"],
  ["seed-ktb-august", "KTB 0869 0503508000023.pdf", "KTB", "ส.ค. 2569", "2026-08-01", "2026-08-31", "application/pdf"],
] as const;

async function ensureDatabase() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS evidence_files (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      storage_key TEXT,
      bank TEXT NOT NULL DEFAULT 'OTHER',
      period TEXT NOT NULL DEFAULT 'ไม่ระบุ',
      statement_from TEXT,
      statement_to TEXT,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'รอตรวจสอบ',
      source TEXT NOT NULL DEFAULT 'upload',
      processing_status TEXT NOT NULL DEFAULT 'รอประมวลผล',
      processed_at TEXT,
      detected_transactions INTEGER NOT NULL DEFAULT 0,
      page_count INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS evidence_files_uploaded_idx ON evidence_files(uploaded_at DESC)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,summary TEXT NOT NULL,before_json TEXT,after_json TEXT,actor TEXT NOT NULL DEFAULT 'Dashboard user',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
  ]);

  const tableInfo = await env.DB.prepare("PRAGMA table_info(evidence_files)").all<{ name: string }>();
  const columns = new Set(tableInfo.results.map((column) => column.name));
  const migrations = [];
  if (!columns.has("statement_from")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN statement_from TEXT"));
  if (!columns.has("statement_to")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN statement_to TEXT"));
  if (!columns.has("processing_status")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'รอประมวลผล'"));
  if (!columns.has("processed_at")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN processed_at TEXT"));
  if (!columns.has("detected_transactions")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN detected_transactions INTEGER NOT NULL DEFAULT 0"));
  if (!columns.has("page_count")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN page_count INTEGER NOT NULL DEFAULT 0"));
  if (migrations.length) await env.DB.batch(migrations);

  await env.DB.batch(seedFiles.map((file) => env.DB.prepare(
    "INSERT OR IGNORE INTO evidence_files (id, file_name, bank, period, statement_from, statement_to, content_type, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'นำเข้ารายงานแล้ว', 'existing')"
  ).bind(...file)));
  await env.DB.prepare("UPDATE evidence_files SET processing_status='นำเข้า Dashboard แล้ว',processed_at=COALESCE(processed_at,uploaded_at) WHERE source='existing'").run();
  await env.DB.prepare("UPDATE evidence_files SET statement_from = COALESCE(statement_from, '2026-01-01'), statement_to = COALESCE(statement_to, '2026-06-30') WHERE statement_from IS NULL OR statement_to IS NULL").run();
}

export async function GET() {
  try {
    await ensureDatabase();
    const result = await env.DB.prepare("SELECT * FROM evidence_files ORDER BY uploaded_at DESC, file_name ASC").all();
    return Response.json({ files: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ไม่สามารถอ่านฐานข้อมูลไฟล์ได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const form = await request.formData();
    const file = form.get("file");
    const bank = String(form.get("bank") || "OTHER").toUpperCase();
    const statementFrom = String(form.get("statement_from") || "").trim();
    const statementTo = String(form.get("statement_to") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(statementFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(statementTo)) {
      return Response.json({ error: "กรุณาระบุวันที่เริ่มและวันที่สิ้นสุดของข้อมูล" }, { status: 400 });
    }
    if (statementFrom > statementTo) {
      return Response.json({ error: "วันที่เริ่มข้อมูลต้องไม่เกินวันที่สิ้นสุด" }, { status: 400 });
    }
    const period = `${statementFrom} ถึง ${statementTo}`;
    const passwordVerified = form.get("password_verified") === "true";
    const extractedText = String(form.get("extracted_text") || "").slice(0, 1_000_000);
    const pageCount = Math.max(0, Math.min(1000, Number(form.get("page_count") || 0)));
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
    }
    const allowed = ["application/pdf", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
    if (!allowed.includes(file.type) && !/\.(pdf|xls|xlsx|csv)$/i.test(file.name)) {
      return Response.json({ error: "รองรับเฉพาะ PDF, XLS, XLSX และ CSV" }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 25 MB" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._ก-๙-]+/g, "-");
    const storageKey = `evidence/${id}/${safeName}`;
    await env.FILES.put(storageKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const datePattern=bank==="KBANK"?/\b\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}\b/g:bank==="BBL"?/\b\d{2}\/\d{2}\/20\d{2}\b/g:/\b\d{2}\/\d{2}\/20\d{2}\s+\d{2}:\d{2}\b/g;
    const matches=extractedText.match(datePattern)||[];
    const detectedTransactions=bank==="BBL"?Math.floor(matches.length/2):matches.length;
    const isPdf=/\.pdf$/i.test(file.name),isCsv=/\.csv$/i.test(file.name);
    const processingStatus=extractedText&&isPdf?`อ่าน PDF แล้ว · ตรวจพบประมาณ ${detectedTransactions} รายการ`:isCsv?"รับไฟล์ CSV แล้ว · รอตรวจรูปแบบคอลัมน์":"รับไฟล์แล้ว · รอประมวลผล Excel";
    const status=extractedText&&isPdf?"อ่านไฟล์แล้ว-รอตรวจยอด":passwordVerified?"พร้อมประมวลผล":"รอตรวจสอบ";
    await env.DB.prepare("INSERT INTO evidence_files (id,file_name,storage_key,bank,period,statement_from,statement_to,content_type,size_bytes,status,source,processing_status,processed_at,detected_transactions,page_count) VALUES (?,?,?,?,?,?,?,?,?,?,'upload',?,CURRENT_TIMESTAMP,?,?)")
      .bind(id,file.name,storageKey,bank,period,statementFrom,statementTo,file.type||"application/octet-stream",file.size,status,processingStatus,detectedTransactions,pageCount).run();
    await env.DB.prepare("INSERT INTO audit_logs (id,action,entity_type,entity_id,summary,after_json) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),"UPLOAD","evidence_file",id,`อัปโหลดและประมวลผล ${bank}: ${file.name}`,JSON.stringify({bank,statementFrom,statementTo,processingStatus,detectedTransactions,pageCount})).run();
    return Response.json({ok:true,id,processingStatus,detectedTransactions,pageCount},{status:201});
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}

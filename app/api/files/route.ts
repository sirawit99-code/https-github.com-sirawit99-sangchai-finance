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
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS evidence_files_uploaded_idx ON evidence_files(uploaded_at DESC)"),
  ]);

  const tableInfo = await env.DB.prepare("PRAGMA table_info(evidence_files)").all<{ name: string }>();
  const columns = new Set(tableInfo.results.map((column) => column.name));
  const migrations = [];
  if (!columns.has("statement_from")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN statement_from TEXT"));
  if (!columns.has("statement_to")) migrations.push(env.DB.prepare("ALTER TABLE evidence_files ADD COLUMN statement_to TEXT"));
  if (migrations.length) await env.DB.batch(migrations);

  await env.DB.batch(seedFiles.map((file) => env.DB.prepare(
    "INSERT OR IGNORE INTO evidence_files (id, file_name, bank, period, statement_from, statement_to, content_type, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'นำเข้ารายงานแล้ว', 'existing')"
  ).bind(...file)));
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
    const status = passwordVerified ? "พร้อมประมวลผล" : "รอตรวจสอบ";
    await env.DB.prepare("INSERT INTO evidence_files (id, file_name, storage_key, bank, period, statement_from, statement_to, content_type, size_bytes, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upload')")
      .bind(id, file.name, storageKey, bank, period, statementFrom, statementTo, file.type || "application/octet-stream", file.size, status).run();
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}

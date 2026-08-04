import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const evidenceFiles = sqliteTable("evidence_files", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key"),
  bank: text("bank").notNull().default("OTHER"),
  period: text("period").notNull().default("ไม่ระบุ"),
  statementFrom: text("statement_from"),
  statementTo: text("statement_to"),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  status: text("status").notNull().default("รอตรวจสอบ"),
  source: text("source").notNull().default("upload"),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

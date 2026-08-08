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
  processingStatus: text("processing_status").notNull().default("รอประมวลผล"),
  processedAt: text("processed_at"),
  detectedTransactions: integer("detected_transactions").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vendorProfiles = sqliteTable("vendor_profiles", {
  id: text("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  canonicalName: text("canonical_name").notNull(),
  category: text("category").notNull().default("รอตรวจสอบ"),
  accountsJson: text("accounts_json").notNull().default("[]"),
  transactionCount: integer("transaction_count").notNull().default(0),
  totalAmountSatang: integer("total_amount_satang").notNull().default(0),
  reviewStatus: text("review_status").notNull().default("รอตรวจสอบ"),
  note: text("note").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  actor: text("actor").notNull().default("Dashboard user"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reconciliationReviews = sqliteTable("reconciliation_reviews", {
  bank: text("bank").primaryKey(),
  differenceSatang: integer("difference_satang").notNull().default(0),
  status: text("status").notNull().default("รอตรวจสอบ"),
  note: text("note").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

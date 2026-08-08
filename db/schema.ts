import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestType: text("request_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  bank: text("bank").notNull().default("ทุกธนาคาร"),
  amountSatang: bigint("amount_satang", { mode: "number" }).notNull().default(0),
  entityId: text("entity_id").notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  requestedBy: text("requested_by").notNull(),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("approval_status_idx").on(table.status),
  index("approval_entity_idx").on(table.requestType, table.entityId),
]);

export const approvalAuditLogs = pgTable("approval_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  approvalId: uuid("approval_id").references(() => approvalRequests.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull(),
  note: text("note").notNull().default(""),
  beforeJson: text("before_json").notNull().default("{}"),
  afterJson: text("after_json").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

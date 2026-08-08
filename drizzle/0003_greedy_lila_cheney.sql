CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`actor` text DEFAULT 'Dashboard user' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reconciliation_reviews` (
	`bank` text PRIMARY KEY NOT NULL,
	`difference_satang` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'รอตรวจสอบ' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `evidence_files` ADD `processing_status` text DEFAULT 'รอประมวลผล' NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence_files` ADD `processed_at` text;--> statement-breakpoint
ALTER TABLE `evidence_files` ADD `detected_transactions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence_files` ADD `page_count` integer DEFAULT 0 NOT NULL;
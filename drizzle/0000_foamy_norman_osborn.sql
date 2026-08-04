CREATE TABLE `evidence_files` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`storage_key` text,
	`bank` text DEFAULT 'OTHER' NOT NULL,
	`period` text DEFAULT 'ไม่ระบุ' NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'รอตรวจสอบ' NOT NULL,
	`source` text DEFAULT 'upload' NOT NULL,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

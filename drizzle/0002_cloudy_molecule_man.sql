CREATE TABLE `vendor_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`canonical_name` text NOT NULL,
	`category` text DEFAULT 'รอตรวจสอบ' NOT NULL,
	`accounts_json` text DEFAULT '[]' NOT NULL,
	`transaction_count` integer DEFAULT 0 NOT NULL,
	`total_amount_satang` integer DEFAULT 0 NOT NULL,
	`review_status` text DEFAULT 'รอตรวจสอบ' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

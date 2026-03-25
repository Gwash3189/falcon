CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`environment_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`flag_id` text NOT NULL,
	`environment_id` text NOT NULL,
	`action` text NOT NULL,
	`actor` text,
	`before_state` text,
	`after_state` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `environments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `environments_project_id_slug_unique` ON `environments` (`project_id`,`slug`);--> statement-breakpoint
CREATE TABLE `flags` (
	`id` text PRIMARY KEY NOT NULL,
	`environment_id` text NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`percentage` integer,
	`identifiers` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flags_environment_id_key_unique` ON `flags` (`environment_id`,`key`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `user_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_api_keys_key_hash_unique` ON `user_api_keys` (`key_hash`);
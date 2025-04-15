CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT '"2025-04-13T00:13:21.492Z"',
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` blob,
	`address` blob,
	`avatar` blob,
	`role` blob,
	`permissions` blob
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `emailUniqueIndex` ON `user` (lower("email"));
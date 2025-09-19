ALTER TABLE `user` RENAME TO `users`;--> statement-breakpoint
DROP INDEX `user_username_unique`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT '"2025-04-23T17:14:04.428Z"',
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` blob,
	`address` blob,
	`avatar` blob,
	`role` integer,
	`permissions` json
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions") SELECT "id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `emailUniqueIndex` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "user_id", "expires_at") SELECT "id", "user_id", "expires_at" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;
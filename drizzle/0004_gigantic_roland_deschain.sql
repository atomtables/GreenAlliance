PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer,
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` blob,
	`address` blob,
	`avatar` blob,
	`role` integer,
	`permissions` json,
	`subteam` text DEFAULT 'All' NOT NULL,
	FOREIGN KEY (`subteam`) REFERENCES `subteams`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions", "subteam") SELECT "id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions", "subteam" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `emailUniqueIndex` ON `users` (`email`);
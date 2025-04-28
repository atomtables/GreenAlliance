PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT '"2025-04-17T13:25:53.112Z"',
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
INSERT INTO `__new_user`("id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions") SELECT "id", "age", "username", "password_hash", "created_at", "first_name", "last_name", "email", "phone", "address", "avatar", "role", "permissions" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `emailUniqueIndex` ON `user` (`email`);
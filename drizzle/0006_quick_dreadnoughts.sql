PRAGMA foreign_keys= OFF;--> statement-breakpoint
CREATE TABLE `__new_joincodes`
(
    `joinCode`   text PRIMARY KEY NOT NULL,
    `role`       integer,
    `firstName`  text,
    `lastName`   text,
    `created_at` integer          NOT NULL,
    `used_at`    integer
);
--> statement-breakpoint
INSERT INTO `__new_joincodes`("joinCode", "role", "firstName", "lastName", "created_at")
SELECT "joinCode", "role", "firstName", "lastName", "created_at"
FROM `joincodes`;--> statement-breakpoint
DROP TABLE `joincodes`;--> statement-breakpoint
ALTER TABLE `__new_joincodes`
    RENAME TO `joincodes`;--> statement-breakpoint
PRAGMA foreign_keys= ON;
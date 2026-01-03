ALTER TABLE "joincodes" ALTER COLUMN "joinCode" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "meeting_attendees" ALTER COLUMN "meeting_id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "meeting_attendees" ALTER COLUMN "user_id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "user" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(36);
ALTER TABLE "meetings" ALTER COLUMN "subteams" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "subteams" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "members" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "members" SET DEFAULT '{}';
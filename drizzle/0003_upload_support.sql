ALTER TABLE "attachments" ADD COLUMN "url" text DEFAULT '' NOT NULL;
ALTER TABLE "attachments" ADD COLUMN "message_id" varchar(21);
ALTER TABLE "attachments" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "files" (
	"id" text PRIMARY KEY NOT NULL,
	"author" varchar(36) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "files_index_author" ON "files" ("author");
ALTER TABLE "files" ADD CONSTRAINT "files_author_users_id_fk" FOREIGN KEY ("author") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "profile_picture_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "profile_picture_tokens_user_idx" ON "profile_picture_tokens" ("user_id");
ALTER TABLE "profile_picture_tokens" ADD CONSTRAINT "profile_picture_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE `usercreatetokens`
    RENAME TO `joincodes`;--> statement-breakpoint
ALTER TABLE `joincodes`
    ADD `created_at` integer;
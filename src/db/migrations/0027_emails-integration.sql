ALTER TABLE "properties" ADD COLUMN "arrival_instructions" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "checkin_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "checkout_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "post_stay_email_sent_at" timestamp with time zone;
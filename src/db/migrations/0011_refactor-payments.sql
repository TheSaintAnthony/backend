ALTER TABLE "payments" ALTER COLUMN "paid_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_status_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "external_reference_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

-- Update existing rows to have a default payment status (assuming 2 is 'completed' for existing payments)
UPDATE "payments" SET "payment_status_id" = 2 WHERE "payment_status_id" IS NULL;--> statement-breakpoint

-- Now make it NOT NULL
ALTER TABLE "payments" ALTER COLUMN "payment_status_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_status_id_payment_status_id_fk" FOREIGN KEY ("payment_status_id") REFERENCES "public"."payment_status"("id") ON DELETE no action ON UPDATE no action;
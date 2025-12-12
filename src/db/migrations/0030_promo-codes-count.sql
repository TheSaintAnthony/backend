ALTER TABLE "reservations" ADD COLUMN "promo_code_id" uuid;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "discount_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "stripe_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "stripe_price_id" varchar(255);
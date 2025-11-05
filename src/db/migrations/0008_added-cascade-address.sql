ALTER TABLE "users" DROP CONSTRAINT "users_address_id_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
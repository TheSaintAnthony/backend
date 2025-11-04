CREATE TABLE "payment_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	CONSTRAINT "payment_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "building_id" TO "property_id";--> statement-breakpoint
ALTER TABLE "reservations" RENAME COLUMN "deposit_amout" TO "deposit_amount";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_building_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method_id" integer NOT NULL; --> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "check_deposit_amount" CHECK (deposit_amount <=total_price);--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "check_total_price" CHECK (total_price >= 0);--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "check_reservation_dates" CHECK (check_out > check_in);--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "check_guests_count" CHECK (guests_count > 0);

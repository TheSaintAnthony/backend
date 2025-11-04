CREATE TABLE "payment_status" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_status_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	CONSTRAINT "payment_status_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reservation_rooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reservation_rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"room_id" integer NOT NULL,
	"reservation_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_room_id_rooms_id_fk";
--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "total_price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "max_capacity" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "phone_number" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "check_in_time" time DEFAULT '15:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "check_out_time" time DEFAULT '11:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "bed_count" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "bathroom_count" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "guests_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "payment_status_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "deposit_amout" numeric(10, 2) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "balance_due" numeric(10, 2) GENERATED ALWAYS AS (total_price - deposit_amout) STORED;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "special_requests" text;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_reservation_room" ON "reservation_rooms" USING btree ("room_id","reservation_id");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_payment_status_id_payment_status_id_fk" FOREIGN KEY ("payment_status_id") REFERENCES "public"."payment_status"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "room_id";
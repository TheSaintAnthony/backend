ALTER TABLE "reservation_rooms" ADD COLUMN "check_in" date NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD COLUMN "check_out" date NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD COLUMN "guests_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "check_in";--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "check_out";--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "guests_count";
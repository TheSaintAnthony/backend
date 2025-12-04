ALTER TABLE "activity_categories" ADD COLUMN "is_system_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN "is_system_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "highlights" ADD COLUMN "is_system_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_status" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_types" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD COLUMN "is_system_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "occurence_status" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_status" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_status" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_system_managed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "is_system_managed" boolean DEFAULT false NOT NULL;

-- Update existing records: mark system-managed lookups as true
UPDATE "reservation_status" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;
UPDATE "invoice_status" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;
UPDATE "invoice_types" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;
UPDATE "occurence_status" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;
UPDATE "roles" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;
UPDATE "payment_status" SET "is_system_managed" = true WHERE "is_system_managed" IS NULL OR "is_system_managed" = false;

-- Update existing records: mark dynamic lookups as false
UPDATE "amenities" SET "is_system_managed" = false WHERE "is_system_managed" IS NULL;
UPDATE "room_types" SET "is_system_managed" = false WHERE "is_system_managed" IS NULL;
UPDATE "highlights" SET "is_system_managed" = false WHERE "is_system_managed" IS NULL;
UPDATE "activity_categories" SET "is_system_managed" = false WHERE "is_system_managed" IS NULL;
UPDATE "menu_categories" SET "is_system_managed" = false WHERE "is_system_managed" IS NULL;
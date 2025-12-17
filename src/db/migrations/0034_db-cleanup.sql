-- Step 1: Drop constraint first
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "check_deposit_amount";--> statement-breakpoint

-- Step 2: Drop generated column balance_due BEFORE deposit_amount (it depends on it)
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "balance_due";--> statement-breakpoint

-- Step 3: Now we can drop deposit_amount
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "deposit_amount";--> statement-breakpoint

-- Step 4: Add metadata columns to images first
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "width" integer;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "height" integer;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "file_size" integer;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "mime_type" varchar(50);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "original_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "storage_provider" varchar(50);--> statement-breakpoint

-- Step 5: Migrate image_metadata data to images (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_metadata') THEN
    UPDATE "images" i
    SET 
      "width" = im."width",
      "height" = im."height",
      "file_size" = im."file_size",
      "mime_type" = im."mime_type",
      "original_filename" = im."original_filename",
      "storage_provider" = im."storage_provider"
    FROM "image_metadata" im
    WHERE i."id" = im."image_id";
  END IF;
END $$;--> statement-breakpoint

-- Step 6: Drop image_metadata table
DROP TABLE IF EXISTS "image_metadata" CASCADE;--> statement-breakpoint

-- Step 7: Change data types
ALTER TABLE "images" ALTER COLUMN "url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "website" SET DATA TYPE text;--> statement-breakpoint

-- Step 8: Handle NULL values before setting NOT NULL constraints
-- Update NULL status_id in reservations to 'Pending' status
UPDATE "reservations" 
SET "status_id" = (SELECT id FROM "reservation_status" WHERE name = 'Pending' LIMIT 1)
WHERE "status_id" IS NULL;--> statement-breakpoint

-- Update NULL status_id in occurrences to 'Pending' status
UPDATE "occurrences" 
SET "status_id" = (SELECT id FROM "occurence_status" WHERE name = 'Pending' LIMIT 1)
WHERE "status_id" IS NULL;--> statement-breakpoint

-- Step 9: Set NOT NULL constraints
ALTER TABLE "reservations" ALTER COLUMN "status_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "status_id" SET NOT NULL;--> statement-breakpoint

-- Step 10: Add deleted_at columns
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entity_types" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "highlights" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoice_status" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoice_types" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "occurence_status" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_status" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservation_status" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoice_sequences" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint

-- Step 11: Add foreign key constraint (check if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_promo_code_id_promo_codes_id_fk'
  ) THEN
    ALTER TABLE "reservations" 
    ADD CONSTRAINT "reservations_promo_code_id_promo_codes_id_fk" 
    FOREIGN KEY ("promo_code_id") 
    REFERENCES "public"."promo_codes"("id") 
    ON DELETE set null 
    ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

-- Step 12: Add check constraint for residence_contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_residence_contact_reference'
  ) THEN
    ALTER TABLE "residence_contacts" 
    ADD CONSTRAINT "check_residence_contact_reference" 
    CHECK (residence_id IS NOT NULL OR residence_unit_id IS NOT NULL);
  END IF;
END $$;
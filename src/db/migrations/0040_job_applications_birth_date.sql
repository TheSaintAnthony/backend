ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "age";--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "birth_date" varchar(10);

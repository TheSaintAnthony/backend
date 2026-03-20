ALTER TABLE "job_postings" ADD COLUMN "title_en" varchar(255);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "title_fr" varchar(255);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "title_de" varchar(255);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "description_fr" text;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "description_de" text;
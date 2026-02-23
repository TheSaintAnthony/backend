ALTER TABLE "job_applications" ADD COLUMN "address" varchar(500);--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "qualifications" text;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "hotel_experience" boolean;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "restaurant_experience" boolean;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "real_estate_experience" boolean;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "driver_license" boolean;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "linkedin_profile" varchar(255);
ALTER TABLE "job_applications" ALTER COLUMN "qualifications" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "birth_date" varchar(10);--> statement-breakpoint
ALTER TABLE "job_applications" DROP COLUMN "age";
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"reporter_name" varchar(255),
	"reporter_email" varchar(255),
	"subject" varchar(100) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"occurrence_date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"good_faith_declaration" boolean NOT NULL,
	"data_consent_given" boolean NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "cloudbeds_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"cloudbeds_property_id" varchar(255),
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudbeds_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid,
	"cloudbeds_reservation_id" varchar(255) NOT NULL,
	"cloudbeds_property_id" uuid NOT NULL,
	"channel_name" varchar(100),
	"guest_name" varchar(255),
	"guest_email" varchar(255),
	"guest_phone" varchar(50),
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"guests_count" integer NOT NULL,
	"adults_count" integer NOT NULL,
	"children_count" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"status" varchar(50) DEFAULT 'confirmed' NOT NULL,
	"third_party_identifier" varchar(255),
	"raw_data" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cloudbeds_reservations_cloudbeds_reservation_id_unique" UNIQUE("cloudbeds_reservation_id")
);
--> statement-breakpoint
CREATE TABLE "cloudbeds_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"cloudbeds_property_id" uuid NOT NULL,
	"cloudbeds_room_type_id" varchar(255),
	"rate_id" varchar(255),
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudbeds_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"operation" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"error_message" text,
	"payload" jsonb,
	"response" jsonb,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloudbeds_properties" ADD CONSTRAINT "cloudbeds_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudbeds_reservations" ADD CONSTRAINT "cloudbeds_reservations_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudbeds_reservations" ADD CONSTRAINT "cloudbeds_reservations_cloudbeds_property_id_cloudbeds_properties_id_fk" FOREIGN KEY ("cloudbeds_property_id") REFERENCES "public"."cloudbeds_properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudbeds_rooms" ADD CONSTRAINT "cloudbeds_rooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudbeds_rooms" ADD CONSTRAINT "cloudbeds_rooms_cloudbeds_property_id_cloudbeds_properties_id_fk" FOREIGN KEY ("cloudbeds_property_id") REFERENCES "public"."cloudbeds_properties"("id") ON DELETE cascade ON UPDATE no action;
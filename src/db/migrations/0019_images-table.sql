CREATE TABLE "entity_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "image_metadata" (
	"image_id" uuid PRIMARY KEY NOT NULL,
	"width" integer,
	"height" integer,
	"file_size" integer,
	"mime_type" varchar(50),
	"original_filename" varchar(255),
	"storage_provider" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"alt_text" varchar(255),
	"caption" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "activity_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "category_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "duration" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "max_guests" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "tourism_fee" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD CONSTRAINT "image_metadata_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_entity_type_id_entity_types_id_fk" FOREIGN KEY ("entity_type_id") REFERENCES "public"."entity_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_images_entity" ON "images" USING btree ("entity_type_id","entity_id");--> statement-breakpoint
CREATE INDEX "idx_images_primary" ON "images" USING btree ("entity_type_id","entity_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_images_order" ON "images" USING btree ("entity_type_id","entity_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_one_primary_per_entity" ON "images" USING btree ("entity_type_id","entity_id") WHERE ("images"."is_primary" = true and "images"."deleted_at" is null);--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_category_id_activity_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."activity_categories"("id") ON DELETE no action ON UPDATE no action;
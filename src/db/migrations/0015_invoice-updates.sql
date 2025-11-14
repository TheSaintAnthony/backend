CREATE TABLE "invoice_providers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_providers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "invoice_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "invoice_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	CONSTRAINT "invoice_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_line_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"product_code" varchar(100),
	"item_type" varchar(50),
	"item_reference_id" integer,
	"quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0.00',
	"total_amount" numeric(10, 2) NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_quantity_positive" CHECK ("invoice_line_items"."quantity" > 0),
	CONSTRAINT "check_unit_price_positive" CHECK ("invoice_line_items"."unit_price" >= 0),
	CONSTRAINT "check_line_total_positive" CHECK ("invoice_line_items"."total_amount" >= 0),
	CONSTRAINT "check_discount_positive" CHECK ("invoice_line_items"."discount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "invoices" RENAME COLUMN "amount" TO "total_amount";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "check_amount_positive";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "issued_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "issued_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nif" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "currency" varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_address" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_country" varchar(2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_number" varchar(50);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_type_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "provider_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "external_invoice_id" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "external_invoice_number" varchar(100);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "external_invoice_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "external_invoice_pdf_path" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_type_id_invoice_types_id_fk" FOREIGN KEY ("invoice_type_id") REFERENCES "public"."invoice_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_provider_id_invoice_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."invoice_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "check_total_amount_positive" CHECK ("invoices"."total_amount" >= 0);
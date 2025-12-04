CREATE TABLE "occurrence_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoice_providers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_methods" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invoice_providers" CASCADE;--> statement-breakpoint
DROP TABLE "payment_methods" CASCADE;--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_provider_id_invoice_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_payment_method_id_payment_methods_id_fk";
--> statement-breakpoint
DROP INDEX "unique_transaction_per_method_idx";--> statement-breakpoint
DROP INDEX "idx_one_primary_per_entity";--> statement-breakpoint
ALTER TABLE "occurrence_responses" ADD CONSTRAINT "occurrence_responses_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrence_responses" ADD CONSTRAINT "occurrence_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_one_primary_per_entity" ON "images" USING btree ("entity_type_id","entity_id");--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "provider_id";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "payment_method_id";

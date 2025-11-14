CREATE TABLE "invoice_sequences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_sequences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"year" integer NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"prefix" varchar(20) DEFAULT 'INV' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_year_prefix_idx" ON "invoice_sequences" USING btree ("year","prefix");
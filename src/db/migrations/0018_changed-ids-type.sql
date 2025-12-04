-- Drop all foreign key constraints first
ALTER TABLE "activity_property" DROP CONSTRAINT IF EXISTS "activity_property_activity_id_activities_id_fk";--> statement-breakpoint
ALTER TABLE "activity_property" DROP CONSTRAINT IF EXISTS "activity_property_property_id_properties_id_fk";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_address_id_addresses_id_fk";--> statement-breakpoint
ALTER TABLE "idempotency_keys" DROP CONSTRAINT IF EXISTS "idempotency_keys_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_role_id_roles_id_fk";--> statement-breakpoint
ALTER TABLE "properties" DROP CONSTRAINT IF EXISTS "properties_address_id_addresses_id_fk";--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_property_id_properties_id_fk";--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_room_type_id_room_types_id_fk";--> statement-breakpoint
ALTER TABLE "room_amenities" DROP CONSTRAINT IF EXISTS "room_amenities_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_amenities" DROP CONSTRAINT IF EXISTS "room_amenities_amenity_id_amenities_id_fk";--> statement-breakpoint
ALTER TABLE "room_highlights" DROP CONSTRAINT IF EXISTS "room_highlights_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_highlights" DROP CONSTRAINT IF EXISTS "room_highlights_highlight_id_highlights_id_fk";--> statement-breakpoint
ALTER TABLE "room_prices" DROP CONSTRAINT IF EXISTS "room_prices_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_holds" DROP CONSTRAINT IF EXISTS "room_holds_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_holds" DROP CONSTRAINT IF EXISTS "room_holds_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_status_id_reservation_status_id_fk";--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_payment_status_id_payment_status_id_fk";--> statement-breakpoint
ALTER TABLE "reservation_rooms" DROP CONSTRAINT IF EXISTS "reservation_rooms_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "reservation_rooms" DROP CONSTRAINT IF EXISTS "reservation_rooms_reservation_id_reservations_id_fk";--> statement-breakpoint
ALTER TABLE "invoice_line_items" DROP CONSTRAINT IF EXISTS "invoice_line_items_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_reservation_id_reservations_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_invoice_type_id_invoice_types_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_provider_id_invoice_providers_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_status_id_invoice_status_id_fk";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_payment_method_id_payment_methods_id_fk";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_payment_status_id_payment_status_id_fk";--> statement-breakpoint
ALTER TABLE "occurrences" DROP CONSTRAINT IF EXISTS "occurrences_reservation_id_reservations_id_fk";--> statement-breakpoint
ALTER TABLE "occurrences" DROP CONSTRAINT IF EXISTS "occurrences_status_id_occurence_status_id_fk";--> statement-breakpoint

-- Convert activities table
ALTER TABLE "activities" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- Convert activity_property table
ALTER TABLE "activity_property" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "activity_property" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "activity_property" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "activity_property" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "activity_property" ALTER COLUMN "activity_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "activity_property" ALTER COLUMN "property_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert addresses table
ALTER TABLE "addresses" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- Convert idempotency_keys table
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "idempotency_keys" ALTER COLUMN "user_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert lookup tables
ALTER TABLE "amenities" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "amenities" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "amenities" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "amenities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "highlights" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "highlights" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "invoice_providers" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoice_providers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_providers" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_providers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "invoice_status" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoice_status" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_status" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_status" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "invoice_types" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoice_types" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_types" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_types" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "occurence_status" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "occurence_status" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "occurence_status" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "occurence_status" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "payment_methods" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "payment_methods" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payment_methods" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payment_methods" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "payment_status" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "payment_status" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payment_status" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payment_status" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "reservation_status" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "reservation_status" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservation_status" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservation_status" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "roles" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "room_types" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- Convert users table
ALTER TABLE "users" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "address_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert user_roles table
ALTER TABLE "user_roles" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert properties table
ALTER TABLE "properties" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "address_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert rooms table
ALTER TABLE "rooms" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "property_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "room_type_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert room_amenities table
ALTER TABLE "room_amenities" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "room_amenities" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_amenities" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_amenities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_amenities" ALTER COLUMN "room_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_amenities" ALTER COLUMN "amenity_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert room_highlights table
ALTER TABLE "room_highlights" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "room_highlights" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_highlights" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_highlights" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_highlights" ALTER COLUMN "room_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_highlights" ALTER COLUMN "highlight_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert room_prices table
ALTER TABLE "room_prices" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "room_prices" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_prices" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_prices" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_prices" ALTER COLUMN "room_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert room_holds table
ALTER TABLE "room_holds" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "room_holds" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "room_holds" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_holds" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_holds" ALTER COLUMN "room_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "room_holds" ALTER COLUMN "user_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert reservations table
ALTER TABLE "reservations" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "user_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "status_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "payment_status_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert reservation_rooms table
ALTER TABLE "reservation_rooms" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservation_rooms" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservation_rooms" ALTER COLUMN "room_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "reservation_rooms" ALTER COLUMN "reservation_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert invoice_line_items table
ALTER TABLE "invoice_line_items" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_line_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_line_items" ALTER COLUMN "invoice_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_line_items" ALTER COLUMN "item_reference_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert invoices table
ALTER TABLE "invoices" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "reservation_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "user_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "invoice_type_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "provider_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert invoice_sequences table
ALTER TABLE "invoice_sequences" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "invoice_sequences" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_sequences" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "invoice_sequences" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- Convert payments table
ALTER TABLE "payments" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "invoice_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_status_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Convert occurrences table
ALTER TABLE "occurrences" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "reservation_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "status_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

-- Recreate foreign key constraints
ALTER TABLE "activity_property" ADD CONSTRAINT "activity_property_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_property" ADD CONSTRAINT "activity_property_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenities" ADD CONSTRAINT "room_amenities_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_highlights" ADD CONSTRAINT "room_highlights_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_highlights" ADD CONSTRAINT "room_highlights_highlight_id_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "highlights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_prices" ADD CONSTRAINT "room_prices_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_holds" ADD CONSTRAINT "room_holds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_holds" ADD CONSTRAINT "room_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_status_id_reservation_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "reservation_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_payment_status_id_payment_status_id_fk" FOREIGN KEY ("payment_status_id") REFERENCES "payment_status"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_type_id_invoice_types_id_fk" FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_provider_id_invoice_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "invoice_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_status_id_invoice_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "invoice_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_status_id_payment_status_id_fk" FOREIGN KEY ("payment_status_id") REFERENCES "payment_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_status_id_occurence_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "occurence_status"("id") ON DELETE no action ON UPDATE no action;
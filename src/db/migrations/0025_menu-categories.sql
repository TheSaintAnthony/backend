CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "restaurant_menu_items" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "restaurant_menu_items" ADD CONSTRAINT "restaurant_menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_menu_items" DROP COLUMN "category";
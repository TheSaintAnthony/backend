-- Add multi-language columns to restaurant_menu_items
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255);
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS name_de VARCHAR(255);
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS description_fr TEXT;
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS description_de TEXT;

-- Add multi-language columns for missing tables
-- This migration adds language columns (en, fr, de) to tables not covered by migration 0041
-- Portuguese (pt) remains as the default language in existing columns
-- Note: properties, rooms, restaurants, residences, amenities, highlights were already added in 0041
-- Note: job_postings was already added in 0042_big_dark_phoenix

-- Activities table
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_de VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT;

-- Activity categories table (lookup)
ALTER TABLE activity_categories
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_de VARCHAR(255);

-- Restaurant menus table
ALTER TABLE restaurant_menus
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_de VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT;

-- Menu category lookup table
ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_de VARCHAR(255);

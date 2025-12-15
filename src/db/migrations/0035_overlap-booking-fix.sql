-- Custom SQL migration file, put your code below! --
-- Fix the no_overlapping_room_bookings constraint to use '[)' instead of '[]'
-- This allows check-out on day X and check-in on day X (non-overlapping)

-- Step 1: Drop the existing constraint
ALTER TABLE reservation_rooms
DROP CONSTRAINT IF EXISTS no_overlapping_room_bookings;

-- Step 2: Recreate the constraint with '[)' (inclusive start, exclusive end)
ALTER TABLE reservation_rooms
ADD CONSTRAINT no_overlapping_room_bookings
EXCLUDE USING gist (
  room_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
)
WHERE (deleted_at IS NULL);
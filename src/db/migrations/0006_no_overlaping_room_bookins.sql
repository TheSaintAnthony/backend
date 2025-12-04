-- Custom SQL migration file, put your code below! --

ALTER TABLE reservation_rooms
ADD COLUMN deleted_at timestamp with time zone;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservation_rooms
ADD CONSTRAINT no_overlapping_room_bookings
EXCLUDE USING gist (
  room_id WITH =,
  daterange(check_in, check_out, '[]') WITH &&
)
WHERE (deleted_at IS NULL);

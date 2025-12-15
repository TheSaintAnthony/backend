DROP INDEX "unique_reservation_room";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_reservation_room_access_code" ON "reservation_rooms" USING btree ("room_id","reservation_id","access_code");
import { relations } from 'drizzle-orm';
import { addresses } from './addresses.schema';
import { users } from './users.schema';
import { userRoles } from './user-roles.schema';
import { roles } from './lookup-tables.schema';
import { properties } from './properties.schema';
import { rooms } from './rooms.schema';
import {
  roomTypes,
  amenities,
  highlights,
  reservationStatus,
  invoiceStatus,
  invoiceTypes,
  occurrenceStatus,
  paymentStatus,
} from './lookup-tables.schema';
import { roomAmenities } from './room-amenities.schema';
import { roomHighlights } from './room-highlights.schema';
import { roomPrices } from './room-prices.schema';
import { reservations } from './reservations.schema';
import { invoices, invoiceLineItems } from './invoices.schema';
import { payments } from './payments.schema';
import { occurrences } from './occurrences.schema';
import { reservationRooms } from './reservation-rooms.schema';
import { activities } from './activities.schema';
import { activityProperty } from './activity-property.schema';
import { entityTypes } from './entity-types.schema';
import { images } from './images.schema';
import { imageMetadata } from './image-metadata.schema';

export const usersRelations = relations(users, ({ one, many }) => ({
  address: one(addresses, {
    fields: [users.addressId],
    references: [addresses.id],
  }),
  userRoles: many(userRoles),
  reservations: many(reservations),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const buildingsRelations = relations(properties, ({ one, many }) => ({
  address: one(addresses, {
    fields: [properties.addressId],
    references: [addresses.id],
  }),
  rooms: many(rooms),
  images: many(images),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  building: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
  roomType: one(roomTypes, {
    fields: [rooms.roomTypeId],
    references: [roomTypes.id],
  }),
  amenities: many(roomAmenities),
  highlights: many(roomHighlights),
  prices: many(roomPrices),
  reservations: many(reservations),
  images: many(images),
}));

export const roomAmenitiesRelations = relations(roomAmenities, ({ one }) => ({
  room: one(rooms, {
    fields: [roomAmenities.roomId],
    references: [rooms.id],
  }),
  amenity: one(amenities, {
    fields: [roomAmenities.amenityId],
    references: [amenities.id],
  }),
}));

export const roomHighlightsRelations = relations(roomHighlights, ({ one }) => ({
  room: one(rooms, {
    fields: [roomHighlights.roomId],
    references: [rooms.id],
  }),
  highlight: one(highlights, {
    fields: [roomHighlights.highlightId],
    references: [highlights.id],
  }),
}));

export const roomPricesRelations = relations(roomPrices, ({ one }) => ({
  room: one(rooms, {
    fields: [roomPrices.roomId],
    references: [rooms.id],
  }),
}));

export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [reservations.userId],
      references: [users.id],
    }),
    status: one(reservationStatus, {
      fields: [reservations.statusId],
      references: [reservationStatus.id],
    }),
    invoices: many(invoices),
    occurrences: many(occurrences),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  reservation: one(reservations, {
    fields: [invoices.reservationId],
    references: [reservations.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  status: one(invoiceStatus, {
    fields: [invoices.statusId],
    references: [invoiceStatus.id],
  }),
  invoiceType: one(invoiceTypes, {
    fields: [invoices.invoiceTypeId],
    references: [invoiceTypes.id],
  }),
  payments: many(payments),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  status: one(paymentStatus, {
    fields: [payments.paymentStatusId],
    references: [paymentStatus.id],
  }),
}));

export const occurrencesRelations = relations(occurrences, ({ one }) => ({
  reservation: one(reservations, {
    fields: [occurrences.reservationId],
    references: [reservations.id],
  }),
  status: one(occurrenceStatus, {
    fields: [occurrences.statusId],
    references: [occurrenceStatus.id],
  }),
}));

export const reservationRoomsRelations = relations(
  reservationRooms,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationRooms.reservationId],
      references: [reservations.id],
    }),
    room: one(rooms, {
      fields: [reservationRooms.roomId],
      references: [rooms.id],
    }),
  }),
);

export const entityTypesRelations = relations(entityTypes, ({ many }) => ({
  images: many(images),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  entityType: one(entityTypes, {
    fields: [images.entityTypeId],
    references: [entityTypes.id],
  }),
  metadata: one(imageMetadata, {
    fields: [images.id],
    references: [imageMetadata.imageId],
  }),
}));

export const imageMetadataRelations = relations(imageMetadata, ({ one }) => ({
  image: one(images, {
    fields: [imageMetadata.imageId],
    references: [images.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ many }) => ({
  images: many(images),
}));

export const activityPropertyRelations = relations(
  activityProperty,
  ({ one, many }) => ({
    activity: one(activities, {
      fields: [activityProperty.activityId],
      references: [activities.id],
    }),
    property: one(properties, {
      fields: [activityProperty.propertyId],
      references: [properties.id],
    }),
    images: many(images),
  }),
);

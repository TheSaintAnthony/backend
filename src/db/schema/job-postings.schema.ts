import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  titleEn: varchar('title_en', { length: 255 }),
  titleFr: varchar('title_fr', { length: 255 }),
  titleDe: varchar('title_de', { length: 255 }),
  location: varchar('location', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  department: varchar('department', { length: 255 }).notNull(),
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  descriptionDe: text('description_de'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobPostingId: uuid('job_posting_id').references(() => jobPostings.id, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  message: text('message'),
  cvFilePath: varchar('cv_file_path', { length: 500 }).notNull(),
  cvOriginalName: varchar('cv_original_name', { length: 255 }).notNull(),

  address: varchar('address', { length: 500 }),
  birthDate: varchar('birth_date', { length: 10 }),
  qualifications: varchar('qualifications', { length: 100 }),
  hotelExperience: boolean('hotel_experience'),
  restaurantExperience: boolean('restaurant_experience'),
  realEstateExperience: boolean('real_estate_experience'),
  driverLicense: boolean('driver_license'),
  linkedinProfile: varchar('linkedin_profile', { length: 255 }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

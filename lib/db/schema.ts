import { pgTable, serial, text, timestamp, real, integer, boolean } from 'drizzle-orm/pg-core'

// Users table - stores user account information
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  defaultBillableRate: real('default_billable_rate'), // Default hourly rate for billing
  currency: text('currency').notNull().default('USD'), // Currency for billing (USD, EUR, GBP, CAD, AUD, CHF)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Projects table - stores project definitions
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#164e63'),
  defaultBillableRate: real('default_billable_rate'), // Default hourly rate for this project
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Time entries table - stores time tracking data
export const timeEntries = pgTable('time_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().default(1), // Default to single user for now
  projectId: integer('project_id').references(() => projects.id),
  date: text('date').notNull(), // YYYY-MM-DD format
  startHour: real('start_hour').notNull(), // 0-23 with decimals
  endHour: real('end_hour').notNull(), // 0-23 with decimals
  duration: real('duration').notNull(), // hours (can be fractional)
  billableRate: real('billable_rate'), // Per-entry billable rate (overrides default)
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Company settings table - stores company-wide configuration
export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  coreStartTime: text('core_start_time').notNull().default('09:00'),
  coreEndTime: text('core_end_time').notNull().default('17:00'),
  workingDays: text('working_days').notNull().default('monday,tuesday,wednesday,thursday,friday'), // Comma-separated
  companyName: text('company_name').notNull().default('My Company'),
  timezone: text('timezone').notNull().default('UTC'),
  weekStartsOn: text('week_starts_on').notNull().default('monday'), // 'saturday' | 'sunday' | 'monday'
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Types for insertion
export type InsertUser = typeof users.$inferInsert
export type SelectUser = typeof users.$inferSelect

export type InsertProject = typeof projects.$inferInsert
export type SelectProject = typeof projects.$inferSelect

export type InsertTimeEntry = typeof timeEntries.$inferInsert
export type SelectTimeEntry = typeof timeEntries.$inferSelect

export type InsertCompanySettings = typeof companySettings.$inferInsert
export type SelectCompanySettings = typeof companySettings.$inferSelect

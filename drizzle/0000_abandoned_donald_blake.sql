CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"core_start_time" text DEFAULT '09:00' NOT NULL,
	"core_end_time" text DEFAULT '17:00' NOT NULL,
	"working_days" text DEFAULT 'monday,tuesday,wednesday,thursday,friday' NOT NULL,
	"company_name" text DEFAULT 'My Company' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"week_starts_on" text DEFAULT 'monday' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#164e63' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"date" text NOT NULL,
	"start_hour" real NOT NULL,
	"end_hour" real NOT NULL,
	"duration" real NOT NULL,
	"billable_rate" real,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"default_billable_rate" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
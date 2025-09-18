-- Create time_entries table to store all time tracking data
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  start_hour INTEGER NOT NULL, -- 0-23 (24-hour format)
  end_hour INTEGER NOT NULL, -- 0-23 (24-hour format)
  duration REAL NOT NULL, -- Duration in hours (can be fractional)
  project TEXT, -- Optional project name
  description TEXT, -- Optional description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- Create projects table for project management
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#10b981', -- Default to accent green
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default projects
INSERT OR IGNORE INTO projects (name, color) VALUES 
  ('Development', '#164e63'),
  ('Meetings', '#10b981'),
  ('Research', '#0891b2'),
  ('Documentation', '#4b5563');

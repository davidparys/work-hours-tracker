import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

// Get database URL from environment or use default
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/work_hours_tracker'

// Create postgres connection
export const sql = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create Drizzle instance
export const db = drizzle(sql, { schema })

// Test database connection
export async function testConnection() {
  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

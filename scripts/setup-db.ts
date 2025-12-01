#!/usr/bin/env tsx
import { execSync } from 'child_process'
import postgres from 'postgres'

const DB_NAME = 'work_hours_tracker'
const DB_USER = 'postgres'
const DB_PASSWORD = 'postgres'
const DB_HOST = 'localhost'
const DB_PORT = '5432'

const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`

console.log('🔧 Setting up PostgreSQL database...\n')

async function setupDatabase() {
  try {
    // Step 1: Check if PostgreSQL is installed
    console.log('📦 Checking PostgreSQL installation...')
    try {
      execSync('which psql', { stdio: 'ignore' })
      console.log('✅ PostgreSQL is installed\n')
    } catch (error) {
      console.error('❌ PostgreSQL is not installed!')
      console.error('Please install PostgreSQL:')
      console.error('  macOS: brew install postgresql@16')
      console.error('  Linux: sudo apt-get install postgresql')
      console.error('  Windows: Download from https://www.postgresql.org/download/\n')
      process.exit(1)
    }

    // Step 2: Check if PostgreSQL is running
    console.log('🚀 Checking if PostgreSQL is running...')
    try {
      // Try to connect to the default postgres database
      const testSql = postgres(`postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres`, {
        connect_timeout: 5,
      })
      await testSql`SELECT 1`
      await testSql.end()
      console.log('✅ PostgreSQL is running\n')
    } catch (error: any) {
      console.error('❌ Cannot connect to PostgreSQL!')
      console.error('Please ensure PostgreSQL is running:')
      console.error('  macOS: brew services start postgresql@16')
      console.error('  Linux: sudo service postgresql start')
      console.error(`\nError: ${error.message}\n`)
      process.exit(1)
    }

    // Step 3: Check if database exists, create if it doesn't
    console.log(`🗄️  Checking if database "${DB_NAME}" exists...`)
    try {
      const adminSql = postgres(`postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres`)
      
      const result = await adminSql`
        SELECT 1 FROM pg_database WHERE datname = ${DB_NAME}
      `
      
      if (result.length === 0) {
        console.log(`📝 Database "${DB_NAME}" does not exist, creating...`)
        await adminSql.unsafe(`CREATE DATABASE ${DB_NAME}`)
        console.log(`✅ Database "${DB_NAME}" created\n`)
      } else {
        console.log(`✅ Database "${DB_NAME}" already exists\n`)
      }
      
      await adminSql.end()
    } catch (error: any) {
      console.error(`❌ Error checking/creating database: ${error.message}\n`)
      process.exit(1)
    }

    // Step 4: Run migrations
    console.log('🔄 Running database migrations...')
    try {
      execSync('pnpm drizzle-kit push', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL }
      })
      console.log('✅ Migrations completed\n')
    } catch (error) {
      console.error('❌ Migration failed!\n')
      process.exit(1)
    }

    // Step 5: Verify connection to the application database
    console.log('🔍 Verifying database connection...')
    try {
      const appSql = postgres(DATABASE_URL)
      await appSql`SELECT 1`
      await appSql.end()
      console.log('✅ Database connection verified\n')
    } catch (error: any) {
      console.error(`❌ Cannot connect to application database: ${error.message}\n`)
      process.exit(1)
    }

    console.log('🎉 Database setup complete!')
    console.log(`📍 Connection string: ${DATABASE_URL}\n`)
  } catch (error: any) {
    console.error(`❌ Unexpected error: ${error.message}\n`)
    process.exit(1)
  }
}

setupDatabase()

# TimeTracker

<p align="center">
  <strong>A modern, open-source work hours tracking application built with Next.js</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

TimeTracker is a self-hosted time tracking application designed for freelancers, contractors, and teams who need to log work hours, manage projects, and generate professional PDF reports. Track your time with day, week, or month views, assign entries to projects, set billable rates, and export beautifully formatted reports.

## Features

### 📅 Multiple View Modes
- **Day View** - Detailed hourly timeline with grid and list layouts
- **Week View** - Weekly overview with daily summaries
- **Month View** - Full calendar view with monthly statistics

### ⏱️ Time Entry Management
- Add individual time entries with start/end times
- **Bulk Add** - Quickly add multiple entries at once
- **Bulk Edit** - Modify multiple entries simultaneously
- Assign entries to specific projects
- Add descriptions to track what you worked on

### 📊 Project Management
- Create unlimited projects with custom colors
- Activate/deactivate projects
- Visual project breakdown in reports
- Color-coded entries across all views

### 💰 Billing & Rates
- Set default billable rates per user
- Override rates on individual entries
- Multi-currency support (USD, EUR, GBP, CAD, AUD, CHF)
- Automatic billing calculations in reports

### 📄 PDF Export
- **Professional Style** - Clean, text-focused reports
- **Visual Style** - Rich formatting with charts and graphs
- Weekly and monthly breakdowns
- Project distribution summaries
- Includes employee and company information

### ⚙️ Customization
- **Personal Settings** - Name, default billable rate, currency
- **Company Settings** - Company name, core working hours, timezone
- Choose week start day (Saturday, Sunday, or Monday)
- Dark/Light theme support

### 💾 Data Management
- PostgreSQL database for reliable storage
- Data import/export capabilities
- Seamless migration from browser storage to database

---

## Requirements

### Software Requirements

| Software | Version | Notes |
|----------|---------|-------|
| **Node.js** | 18.x or higher | LTS version recommended |
| **pnpm** | 8.x or higher | Package manager |
| **PostgreSQL** | 14.x or higher | Database server |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/work-hours-tracker.git
cd work-hours-tracker
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up PostgreSQL

#### macOS (using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Verify it's running
brew services list
```

#### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows

Download and install from [postgresql.org/download](https://www.postgresql.org/download/windows/)

### 4. Configure Database Connection

The application uses the following default connection:

```
postgresql://postgres:postgres@localhost:5432/work_hours_tracker
```

To customize, set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

Or create a `.env.local` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/work_hours_tracker
```

### 5. Start the Development Server

```bash
pnpm dev
```

This will:
1. Automatically check PostgreSQL installation
2. Create the database if it doesn't exist
3. Run database migrations
4. Start the Next.js development server

The app will be available at **http://localhost:1337**

---

## Production Deployment

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

### Database Management Commands

```bash
# Push schema changes to database
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

---

## Usage

### Tracking Time

1. **Select a date** using the date navigator
2. Click **"Add Entry"** to log time
3. Choose start and end times
4. (Optional) Assign a project and add a description
5. Click **"Add Entry"** to save

### Managing Projects

1. Click the **Settings** icon in the top navigation
2. Select **"Manage Projects"**
3. Add new projects with custom colors
4. Toggle project active status as needed

### Exporting Reports

1. Click **"Export PDF"** in the top navigation
2. Select your date range
3. Choose a report style (Professional or Visual)
4. Toggle project breakdown if desired
5. Click **"Generate PDF"**

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Date Utilities**: [date-fns](https://date-fns.org/)

---

## Project Structure

```
work-hours-tracker/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── day-view.tsx      # Day view component
│   ├── week-view.tsx     # Week view component
│   ├── month-view.tsx    # Month view component
│   └── ...               # Other components
├── lib/                   # Utility libraries
│   ├── db/               # Database configuration
│   │   ├── schema.ts     # Drizzle schema definitions
│   │   ├── queries.ts    # Database queries
│   │   └── client.ts     # Database client
│   ├── database.ts       # Database abstraction layer
│   ├── pdf-generator.ts  # PDF export functionality
│   └── utils/            # Helper utilities
├── drizzle/              # Database migrations
├── scripts/              # Setup scripts
└── public/               # Static assets
```

---

## Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs** - Found a bug? Open an issue!
- 💡 **Suggest Features** - Have an idea? We'd love to hear it!
- 📝 **Improve Documentation** - Help make our docs better
- 🔧 **Submit Pull Requests** - Code contributions are always welcome

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Guidelines

- Write TypeScript with proper type annotations
- Follow the existing code style and patterns
- Add comments for complex logic
- Write all code and comments in English
- Test your changes before submitting

### Pull Request Checklist

- [ ] Code compiles without errors (`pnpm build`)
- [ ] All existing functionality still works
- [ ] New features have been tested
- [ ] Code follows project conventions

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Support

If you find this project helpful, please consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting** any issues you find
- 💬 **Sharing** with others who might find it useful

---

<p align="center">
  Built with ❤️ by the community
</p>

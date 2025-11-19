# Development Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development
```bash
# Start time tracker backend
npm run dev

# Or use the workspace utility
node scripts/workspace.js dev time-tracker
```

### 3. Test API Endpoints

Visit `http://localhost:3000` to see the API documentation page.

#### Test the API endpoints:

**Get Projects:**
```bash
curl http://localhost:3000/api/projects
```

**Create a Time Entry:**
```bash
curl -X POST http://localhost:3000/api/time-entries \
  -H "Content-Type: application/json" \
  -d '{"projectId": "proj-1", "description": "Working on API development"}'
```

**Get Time Entries:**
```bash
curl "http://localhost:3000/api/time-entries?userId=user-1"
```

**Stop a Time Entry:**
```bash
curl -X PATCH http://localhost:3000/api/time-entries/[entry-id]/stop \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Workspace Commands

Use the workspace utility for common tasks:

```bash
# List all available apps
node scripts/workspace.js list

# Build all applications
node scripts/workspace.js build:all

# Lint all code
node scripts/workspace.js lint

# Clean build artifacts
node scripts/workspace.js clean

# Show help
node scripts/workspace.js help
```

## Adding New Applications

1. Create new directory in `apps/`
2. Set up package.json with `@ace-ems/app-name` naming
3. Configure TypeScript to extend root tsconfig
4. Add to workspace script in `scripts/workspace.js`
5. Update main README.md

## Shared Package Development

The `@ace-ems/shared` package contains:
- Common TypeScript types
- Utility functions
- Shared business logic

To add new shared code:
1. Add types to `packages/shared/types/`
2. Add utilities to `packages/shared/lib/`
3. Export from `packages/shared/index.ts`
4. Import using `@ace-ems/shared` in apps

## Database Setup (Future)

Currently using in-memory storage for demonstration. 

For production, consider:
- PostgreSQL with Prisma ORM
- MongoDB with Mongoose
- SQLite for development

## Authentication (Future)

Planned authentication options:
- NextAuth.js with multiple providers
- JWT tokens for API access
- Role-based access control (admin, manager, employee)

## Deployment

Each app can be deployed independently:

**Time Tracker Backend:**
- Vercel (recommended for Next.js)
- Docker containers
- AWS/Azure/GCP

**Environment Variables:**
```bash
# .env.local (for development)
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## VS Code Settings

Recommended VS Code extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense

Workspace settings are configured for optimal monorepo development.
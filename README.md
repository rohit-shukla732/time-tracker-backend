# ACE EMS - Enterprise Management System

A comprehensive monorepo for building enterprise management applications including Time Tracking, Inventory Management System (IMS), Human Resource Management System (HRMS), and more.

## 🏗️ Monorepo Structure

```
ace-ems/
├── apps/                          # Application packages
│   └── time-tracker-backend/      # Time Tracker Next.js Backend
│       ├── prisma/                # Database schema and migrations
│       ├── lib/                   # App-specific utilities (Prisma client)
│       └── app/                   # Next.js app router structure
├── packages/                      # Shared packages
│   └── shared/                    # Common types, utilities, and auth helpers
├── package.json                   # Root workspace configuration
└── tsconfig.json                  # Root TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- PostgreSQL 14+ (for time tracker backend)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ace-ems
```

2. Install dependencies for all workspaces:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy and edit the environment file for time tracker
cp apps/time-tracker-backend/.env.example apps/time-tracker-backend/.env
```

### Database Setup

Initialize and migrate the database:
```bash
# Push schema to database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate
```

### Development

#### Time Tracker Backend
Start the development server:
```bash
npm run dev
```
This will start the Next.js backend at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start the time tracker backend in development mode
- `npm run build` - Build all applications
- `npm run lint` - Lint all applications
- `npm run type-check` - Type check all applications

#### Database Scripts
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database and run migrations
- `npm run clean` - Clean build artifacts

## 📱 Applications

### Time Tracker Backend (`apps/time-tracker-backend`)
A Next.js-based backend API for time tracking functionality. Designed to work with desktop and mobile time tracking clients.

**Features:**
- ✅ Time entry management (start/stop/pause)
- ✅ Project management
- ✅ RESTful API endpoints
- 🔄 Client management (coming soon)
- 🔄 User authentication (coming soon)
- 🔄 Reporting and analytics (coming soon)

**API Endpoints:**
- `GET /api/time-entries` - List time entries with filtering
- `POST /api/time-entries` - Create new time entry
- `PATCH /api/time-entries/[id]/stop` - Stop a running time entry
- `GET /api/projects` - List active projects
- `POST /api/projects` - Create new project

### Shared Package (`packages/shared`)
Common types, utilities, and business logic shared across all applications.

**Exports:**
- TypeScript types for Time Tracker entities
- Utility functions for time calculations
- Common validation functions
- Shared constants and enums

## 🔮 Future Applications

The monorepo is designed to accommodate additional enterprise applications:

- **IMS (Inventory Management System)** - `apps/ims-backend`
- **HRMS (Human Resource Management System)** - `apps/hrms-backend`
- **CRM (Customer Relationship Management)** - `apps/crm-backend`
- **Accounting System** - `apps/accounting-backend`

## 🏛️ Architecture

### Monorepo Benefits
- **Code Sharing**: Shared types and utilities across all applications
- **Consistent Tooling**: Unified linting, testing, and build processes
- **Simplified Dependencies**: Centralized dependency management
- **Cross-App Integration**: Easy integration between different EMS modules

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Package Manager**: npm with workspaces
- **Styling**: Tailwind CSS
- **Linting**: ESLint

## 📝 Development Guidelines

### Adding New Applications
1. Create new directory in `apps/`
2. Set up package.json with workspace naming convention `@ace-ems/app-name`
3. Configure TypeScript to extend root tsconfig
4. Add workspace reference to root package.json
5. Update this README

### Shared Code
- Place shared types in `packages/shared/types/`
- Add utility functions to `packages/shared/lib/`
- Export everything through `packages/shared/index.ts`
- Import shared code using `@ace-ems/shared` alias

## 🤝 Contributing

1. Create feature branches from `main`
2. Follow conventional commit format
3. Ensure all tests pass and code is properly typed
4. Update documentation as needed

## 📜 License

Private - ACE EMS Project
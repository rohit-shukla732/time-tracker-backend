# Time Tracker Backend

A Next.js backend API for time tracking and employee management system with authentication, role-based access control, and team management features.

## 🚀 Project Structure

```
time-tracker-backend/
├── app/                          # Next.js app router
│   └── api/                      # API routes
│       ├── auth/                 # Authentication endpoints
│       ├── users/                # User management
│       ├── teams/                # Team management
│       ├── events/               # Time tracking events
│       └── dashboard/            # Dashboard data
├── lib/                          # Utilities and configurations
├── prisma/                       # Database schema and migrations
└── public/                       # Static files
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- PostgreSQL 14+

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd time-tracker-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy and edit the environment file
cp .env.example .env
```

### Database Setup

Initialize and migrate the database:
```bash
# Push schema to database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### Development
Start the development server:
```bash
npm run dev
```
This will start the Next.js backend at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application
- `npm run start` - Start the production server
- `npm run lint` - Lint the codebase
- `npm run type-check` - Type check the project

#### Database Scripts
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database and run migrations
- `npm run db:seed` - Seed the database with initial data

## 📱 Applications

### Time Tracker Backend (`apps/time-tracker-backend`)
A Next.js-based backend API for time tracking functionality. Designed to work with desktop and mobile time tracking clients.

**Features:**
- ✅ Time entry management (start/stop/pause)
- ✅ Project management
- ✅ RESTful API endpoints
- ✅ Biometric attendance integration (Microsoft SQL Server)
- 🔄 Client management (coming soon)
- 🔄 User authentication (coming soon)
- 🔄 Reporting and analytics (coming soon)

**API Endpoints:**
- `GET /api/time-entries` - List time entries with filtering
- `POST /api/time-entries` - Create new time entry
- `PATCH /api/time-entries/[id]/stop` - Stop a running time entry
- `GET /api/projects` - List active projects
- `POST /api/projects` - Create new project

**Biometric Attendance Integration:**
- `GET /api/hr/biometric/test-connection` - Test connection to biometric database
- `GET /api/hr/biometric/attendance` - Fetch attendance records from biometric system

See [Biometric Integration Guide](docs/BIOMETRIC_INTEGRATION.md) for setup instructions.

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
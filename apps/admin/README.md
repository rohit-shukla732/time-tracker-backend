# ACE EMS Admin Interface

A modern React-based admin interface for managing the ACE EMS (Enterprise Management System) with role-based access control.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, HR, MANAGER, EMPLOYEE)
- Session management with automatic logout
- Protected routes based on user roles

### 👥 User Management
- View all users with role-based filtering
- Edit user roles (Admin only)
- Search and filter users
- Real-time role updates

### 🏢 Team Management
- Create and manage organizational teams
- Assign managers to teams
- Add/remove team members
- Team hierarchy visualization

### 📊 Dashboard & Analytics
- Role-based dashboard views
- Real-time statistics
- Session tracking
- User activity monitoring
- Team performance metrics

## Quick Start

### Prerequisites
- Node.js 18+
- Running ACE EMS backend on port 3000

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The admin interface will be available at `http://localhost:3001`

### Demo Users
Login with these demo accounts (password: `demo123`):

- **Admin**: `admin@aceems.com` - Full system access
- **HR**: `hr@aceems.com` - User and team management
- **Manager**: `dev.manager@aceems.com` - Team member access only

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety
- **Authentication**: JWT tokens with context-based state management

### Folder Structure
```
apps/admin/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── users/            # User management
│   ├── teams/            # Team management
│   └── globals.css       # Global styles
├── components/            # Reusable components
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── lib/                   # Utilities
│   ├── auth.tsx          # Authentication context
│   └── api.ts            # API client
└── types/                 # TypeScript definitions
```

### Authentication Flow
1. User logs in with email/password
2. Backend validates credentials and returns JWT token
3. Token stored in localStorage for persistence
4. All API requests include Authorization header
5. Routes protected based on user role

### Role-Based Access Control

| Feature | ADMIN | HR | MANAGER | EMPLOYEE |
|---------|-------|----|---------| ---------|
| View All Users | ✅ | ✅ | ❌ | ❌ |
| Edit User Roles | ✅ | ❌ | ❌ | ❌ |
| Manage Teams | ✅ | ✅ | ❌ | ❌ |
| View Team Data | ✅ | ✅ | ✅ (own team) | ❌ |
| Dashboard Access | ✅ (all data) | ✅ (all data) | ✅ (team data) | ✅ (own data) |

## API Integration

The admin interface integrates with the ACE EMS backend API:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh

### User Management
- `GET /api/users` - List users (role-filtered)
- `PATCH /api/users/:id/role` - Update user role

### Team Management
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id/members` - Remove team member

### Dashboard Data
- `GET /api/dashboard` - Role-based dashboard data

## Development

### Available Scripts
```bash
npm run dev          # Start development server (port 3001)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Environment Variables
Create `.env.local` for custom configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Code Style
- TypeScript strict mode enabled
- ESLint + Next.js config
- Tailwind CSS for styling
- Component-based architecture
- Custom hooks for state management

## Security Features

### Authentication Security
- JWT tokens with expiration
- Secure token storage
- Automatic logout on token expiry
- CSRF protection via SameSite cookies

### Access Control
- Route-level protection
- Component-level role checks
- API-level authorization
- Principle of least privilege

### Data Protection
- No sensitive data in localStorage
- Encrypted API communications
- Role-based data filtering
- Audit trail capabilities

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup
- Ensure backend API is accessible
- Configure CORS for production domains
- Set up proper SSL certificates
- Configure reverse proxy if needed

## Troubleshooting

### Common Issues

**Login fails with 401 error**
- Verify backend is running on port 3000
- Check demo user credentials
- Ensure database is seeded

**Role permissions not working**
- Verify user role in backend database
- Check JWT token payload
- Confirm API endpoint permissions

**Dashboard shows no data**
- Verify backend API is accessible
- Check browser network tab for errors
- Confirm user has appropriate permissions

### Getting Help
- Check backend logs for API errors
- Use browser developer tools for debugging
- Verify network connectivity to backend
- Review authentication flow in network tab

## Contributing

1. Follow existing code patterns
2. Add TypeScript types for new features
3. Include error handling
4. Test with different user roles
5. Update documentation for new features

## License

Part of the ACE EMS project - Enterprise Management System.
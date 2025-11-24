# Time Tracker Backend API Endpoints

## Current Endpoint Status

### Authentication Endpoints
- ✅ `POST /api/auth/login` - Login with email/password
- ✅ `POST /api/auth/refresh` - Refresh access token
- ✅ `POST /api/auth/logout` - Logout and invalidate refresh token
- ✅ `POST /api/auth/register` - Register new user (uses Prisma)
- ⚠️ `POST /api/register` - Duplicate register endpoint (in-memory, should be removed)

### Time Tracking Endpoints
- ❌ `POST /api/time-entries` - Start new time entry (MISSING)
- ❌ `PUT /api/time-entries/:id` - Update/stop time entry (MISSING)
- ❌ `GET /api/time-entries` - List user's time entries (MISSING)
- ❌ `DELETE /api/time-entries/:id` - Delete time entry (MISSING)

### Activity Tracking Endpoints
- ✅ `POST /api/events` - Record break/idle/focus events
- ✅ `GET /api/events` - List events (debug)
- ✅ `POST /api/app-switch` - Record app switch events
- ✅ `POST /api/heartbeat` - Client heartbeat
- ✅ `GET /api/heartbeat` - Get client status

### Session Management
- ✅ `POST /api/session/start` - Start tracking session
- ✅ `GET /api/session/start` - List sessions (debug)
- ✅ `POST /api/session/end` - End tracking session
- ✅ `GET /api/session/end` - List ended sessions (debug)

### Health & Monitoring
- ✅ `GET /api/health` - Health check

## Issues to Fix

1. **Duplicate Registration Endpoints**: Remove `/api/register` and keep `/api/auth/register`
2. **Missing Time Entry Management**: Core time tracking functionality missing
3. **Auth Integration**: Time tracking endpoints need authentication
4. **Inconsistent Import Paths**: Some files still use wrong import paths
5. **Database Integration**: Some endpoints use in-memory stores instead of Prisma

## Missing Core Functionality

### Time Entry Management
The core time tracking functionality is missing. Need to implement:
- Start/stop time tracking
- List user's time entries with filtering
- Update time entries
- Delete time entries

### User Profile
- `GET /api/me` - Get current user profile
- `PUT /api/me` - Update user profile

### Dashboard Data
- `GET /api/dashboard/summary` - Get time tracking summary
- `GET /api/dashboard/activity` - Get recent activity
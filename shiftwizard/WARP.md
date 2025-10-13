# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Commands

### Development Workflow

```bash
# Initial setup (from project root)
npm install
cd backend && npm install

# Start development servers
# Terminal 1: Backend server
cd backend && npm run dev

# Terminal 2: Frontend server (from project root)
npm run dev

# Database operations (from backend directory)
cd backend
npm run init-db  # Initialize database and create tables
npm run seed      # Seed with sample data (admin@shiftwizard.com / admin123)

# Build for production
npm run build

# Linting
npm run lint
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Manual cloud deployment
./deploy-vultr.sh
```

## Architecture Overview

### Full-Stack Structure

The application follows a React frontend + Express backend pattern with clear separation:

- **Frontend**: Vite-powered React SPA in `/src` with premium glass-morphism UI
- **Backend**: Express REST API in `/backend` with SQLite database and JWT auth
- **Communication**: Axios-based API client with automatic token injection and error handling
- **Deployment**: Containerized with Docker, reverse-proxied through Nginx

### Frontend Architecture

The React application uses a modular component structure with centralized API management:

```
src/
├── api/              # Centralized API layer
│   ├── apiClient.js  # Axios instance with interceptors
│   ├── entities.js   # Entity-specific CRUD operations
│   └── integrations.js # External service integrations
├── components/       # Feature-organized components
│   ├── ui/          # Shadcn/ui components (DO NOT MODIFY)
│   └── [feature]/   # Feature-specific components
├── pages/           # Route-level components
└── lib/            # Utility functions and helpers
```

The frontend follows these architectural patterns:
- **Single API Client**: All HTTP requests go through `apiClient.js` with automatic auth handling
- **Entity Pattern**: Each resource (Employee, Schedule, etc.) has standardized CRUD methods
- **JWT Token Flow**: Token stored in localStorage, auto-injected via Axios interceptors
- **Error Boundaries**: 401 errors trigger automatic logout and redirect to `/login`
- **Glass-morphism Design**: Premium UI with CSS custom properties defined in `Layout.jsx`

### Backend Architecture  

The Express backend implements a layered REST API with role-based access control:

```
backend/
├── models/          # Database layer
│   └── database.js  # SQLite connection and query methods
├── middleware/      # Cross-cutting concerns
│   └── auth.js     # JWT auth and role verification
├── routes/         # API endpoints by domain
│   ├── auth.js     # Authentication endpoints
│   ├── employees.js # Employee management
│   └── [resource].js # Resource-specific routes
└── scripts/        # Database utilities
    ├── init-db.js  # Schema creation
    └── seed-db.js  # Sample data generation
```

Key backend patterns:
- **Role-Based Auth**: Three roles (admin, manager, employee) with middleware-based enforcement
- **SQLite Database**: Lightweight embedded database with direct SQL queries
- **JWT Authentication**: Stateless auth with 24-hour token expiration
- **Rate Limiting**: Protection against abuse via express-rate-limit
- **File Uploads**: Multer-based file handling with /uploads directory

## Key Integration Patterns

### Authentication Flow

1. **Login**: `POST /api/auth/login` returns JWT token and user object
2. **Storage**: Token stored in `localStorage` as `authToken`
3. **Request Injection**: Axios interceptor adds `Authorization: Bearer ${token}` header
4. **Validation**: Backend middleware verifies token and populates `req.user`
5. **Role Check**: `requireRole(['admin', 'manager'])` middleware enforces permissions
6. **Auto Logout**: 401 responses clear localStorage and redirect to login

### Data Flow Pattern

All data operations follow this consistent pattern:

```javascript
// Frontend (using entity pattern)
import { Employee } from '@/api/entities';

// Standard CRUD operations
const employees = await Employee.findAll();
const employee = await Employee.findById(id);
const newEmployee = await Employee.create(data);
await Employee.update(id, data);
await Employee.delete(id);
```

Backend endpoints follow RESTful conventions:
- `GET /api/[resource]` - List all
- `GET /api/[resource]/:id` - Get single
- `POST /api/[resource]` - Create new
- `PUT /api/[resource]/:id` - Update existing
- `DELETE /api/[resource]/:id` - Delete

### Component Communication

The application uses prop drilling and local state management:
- **User Context**: User object fetched via `User.me()` in Layout component
- **Loading States**: Managed per-component with Skeleton placeholders
- **Error Handling**: Try/catch blocks at component level with console.error logging
- **Optimistic Updates**: Local state updated before API confirmation where appropriate

### Database Schema Relationships

```sql
users (id, email, password_hash, full_name, role)
  ↓
employees (id, user_id, department, position, phone, skills, availability)
  ↓
assignments (id, schedule_id, employee_id, shift_template_id, date, status)
  ↑            ↑                              ↑
schedules    employees                  shift_templates
(id, name,   (referenced)              (id, name, start_time,
 start_date,                            end_time, required_staff)
 end_date, status)
```

## Important Context from Documentation

### From Copilot Instructions

- **Premium Design System**: Uses glass-morphism with `.premium-card` class and gradient utilities
- **Path Resolution**: Use `@/` imports configured in Vite for all internal modules
- **Animation Timing**: Always use `cubic-bezier(0.4, 0, 0.2, 1)` for consistency
- **Icon Library**: Exclusively use `lucide-react` for all icons
- **Dark Mode**: Stored in localStorage, toggled via CSS classes on root element

### Default Credentials

After running `npm run seed` in backend:
- **Admin**: admin@shiftwizard.com / admin123  
- **Manager**: manager@shiftwizard.com / manager123

### Environment Variables

```bash
# Backend (.env)
JWT_SECRET=your-super-secure-jwt-secret-change-this
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=3001

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001/api
```

## Quick Reference

### File Upload Pattern
```javascript
// Frontend
const formData = new FormData();
formData.append('file', file);
await apiClient.post('/files/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Role Hierarchy
- **admin**: Full system access, all CRUD operations
- **manager**: Employee and schedule management
- **employee**: Read-only access to assignments

### Database Location
- Development: `backend/data/shiftwizard.db`
- Docker: Mounted volume at `./data:/app/backend/data`

### API Response Format
```javascript
// Success
{ message: "Operation successful", data: {...} }

// Error  
{ error: "Error Type", message: "Details", details: [...] }
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shiftwizard.com","password":"admin123"}'
```
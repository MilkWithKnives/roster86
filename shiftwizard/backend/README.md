# ShiftWizard Backend

A complete REST API backend for the ShiftWizard employee scheduling application.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Employee Management**: CRUD operations for employee data with availability tracking
- **Shift Templates**: Reusable shift patterns with skill requirements
- **Scheduling**: Create and manage work schedules with assignments
- **Integrations**: Mock endpoints for LLM, email, and file operations
- **Database**: SQLite database with automated setup and seeding

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Initialize Database
```bash
npm run init-db
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee (admin/manager)
- `PUT /api/employees/:id` - Update employee (admin/manager)
- `DELETE /api/employees/:id` - Delete employee (admin/manager)

### Shift Templates
- `GET /api/shift-templates` - Get all shift templates
- `GET /api/shift-templates/:id` - Get shift template by ID
- `POST /api/shift-templates` - Create new template (admin/manager)
- `PUT /api/shift-templates/:id` - Update template (admin/manager)
- `DELETE /api/shift-templates/:id` - Delete template (admin/manager)

### Schedules
- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create new schedule (admin/manager)
- `PUT /api/schedules/:id` - Update schedule (admin/manager)
- `DELETE /api/schedules/:id` - Delete schedule (admin/manager)

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create new assignment (admin/manager)
- `PUT /api/assignments/:id` - Update assignment (admin/manager)
- `DELETE /api/assignments/:id` - Delete assignment (admin/manager)

### App Settings
- `GET /api/app-settings` - Get application settings
- `PUT /api/app-settings` - Update settings (admin only)

### Integrations
- `POST /api/ai/llm` - LLM integration (mock)
- `POST /api/email/send` - Send email (mock)
- `POST /api/files/upload` - Upload file
- `POST /api/ai/generate-image` - Generate image (mock)
- `POST /api/files/extract-data` - Extract data from file (mock)
- `POST /api/files/signed-url` - Create signed URL (mock)
- `POST /api/files/upload-private` - Upload private file

## Default Users (after seeding)

- **Admin**: `admin@shiftwizard.com` / `admin123`
- **Manager**: `manager@shiftwizard.com` / `manager123`

## Database Schema

### Users
- Authentication and user profile information
- Roles: admin, manager, employee

### Employees
- Employee details, availability, skills, and status
- Links to user accounts for authentication

### Shift Templates
- Reusable shift patterns with time ranges and requirements
- Skill requirements and staffing levels

### Schedules
- Time periods for organizing shifts
- Status tracking (draft, published, archived)

### Assignments
- Individual shift assignments to employees
- Links schedules, employees, and shift templates

### App Settings
- Configurable application settings
- Key-value pairs for system configuration

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run init-db` - Initialize database and create tables
- `npm run seed` - Seed database with sample data

### File Structure
```
backend/
├── models/
│   └── database.js       # Database connection and setup
├── middleware/
│   └── auth.js          # Authentication middleware
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── employees.js     # Employee management
│   ├── shift-templates.js
│   ├── schedules.js
│   ├── assignments.js
│   ├── app-settings.js
│   └── integrations.js  # Mock integration endpoints
├── scripts/
│   ├── init-db.js       # Database initialization
│   └── seed-db.js       # Sample data seeding
├── uploads/             # File upload directory
├── server.js            # Main server file
└── package.json
```

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Generate strong JWT secret
3. Configure real integration services (replace mocks)
4. Set up proper file storage (AWS S3, etc.)
5. Configure production database if needed
6. Set up reverse proxy (nginx) for static files
7. Use process manager (PM2) for server management

## Security Features

- JWT token authentication
- Role-based authorization
- Rate limiting
- Input validation
- SQL injection prevention
- File upload restrictions
- CORS configuration
- Security headers (Helmet)

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [ ... ] // For validation errors
}
```

## Testing the API

Use the health check endpoint to verify the server is running:
```bash
curl http://localhost:3001/health
```

For development, you can use tools like:
- **Postman** - GUI API testing
- **curl** - Command line testing
- **VS Code REST Client** - In-editor testing

## Support

For questions or issues, check the main project README or create an issue in the repository.
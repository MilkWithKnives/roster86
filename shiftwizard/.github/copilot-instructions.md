# Roster86 Copilot Instructions

## Project Overview
Roster86 is a React-based employee scheduling application with a premium glass-morphism design system and comprehensive shift management features. It uses a custom REST API backend with token-based authentication.

## Architecture Patterns

### API Integration
- Custom REST API client using Axios in `@/api/apiClient.js`
- All data operations use custom API entities: `Employee`, `ShiftTemplate`, `Schedule`, `Assignment`, `User`
- Import entities from `@/api/entities.js` - standardized API interface
- Authentication via JWT tokens stored in localStorage
- Automatic token refresh and error handling via Axios interceptors

### Component Organization
```
components/
├── dashboard/     # Dashboard-specific widgets
├── employees/     # Employee management components  
├── schedules/     # Schedule and shift components
├── templates/     # Shift template components
├── ui/           # Shadcn/ui components (DO NOT MODIFY)
└── utils/        # Utility components
```

### Premium UI Design System
- Uses glass-morphism design with CSS custom properties in `Layout.jsx`
- Premium cards: `.premium-card` class with backdrop-blur and gradients
- Consistent gradient classes: `.gradient-primary`, `.gradient-secondary`, `.gradient-tertiary`
- Dark/light mode stored in localStorage, toggled via CSS classes
- Animations use `cubic-bezier(0.4, 0, 0.2, 1)` timing

### Routing & Navigation
- React Router with nested structure in `src/pages/index.jsx`
- Page URLs generated via `createPageUrl()` utility function
- Navigation sidebar with active state indicators using gradient backgrounds
- Layout component wraps all pages with shared header/sidebar

## Development Patterns

### Component Patterns
- Functional components with hooks (React 18)
- Props destructuring with defaults: `{ stats, isLoading }`
- Conditional rendering for loading states using Skeleton components
- CSS-in-JS for dynamic theming via CSS custom properties

### State Management
- Local state with `useState` for UI state
- `useEffect` for data fetching with async/await
- User state fetched via `User.me()` in Layout component
- No global state management - rely on prop drilling and context

### API Call Patterns
- All entities follow consistent CRUD patterns: `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- Authentication calls: `User.login()`, `User.logout()`, `User.me()`
- Error handling with try/catch blocks and automatic 401 redirects
- Loading states managed at component level

### Styling Conventions
- Tailwind CSS with custom CSS variables for theming
- Class composition: `premium-card`, `nav-item`, animation classes
- Responsive design: `md:`, `lg:` breakpoints extensively used
- Icons from `lucide-react` exclusively

### File Structure
- Page components in `src/pages/`
- Reusable components organized by feature domain
- Utilities in both `src/utils/` (TypeScript) and `src/lib/` (JavaScript)
- API layer separated in `src/api/`

## Development Workflow

### Commands
```bash
npm install       # Install dependencies including axios
npm run dev       # Development server with Vite
npm run build     # Production build
npm run lint      # ESLint with React rules
```

### Environment Variables
- `VITE_API_BASE_URL` - Backend API base URL (defaults to http://localhost:3001/api)
- Configure in `.env` file for development

### Path Resolution
- Use `@/` imports for all internal modules (configured in Vite)
- Import UI components: `@/components/ui/component-name`
- Import entities: `@/api/entities` 
- Import pages: `@/pages/PageName`

### Integration Points
- Custom API services in `@/api/integrations` for LLM, email, file operations
- File uploads via multipart/form-data
- Image generation and data extraction services
- Email notifications through custom backend

## Key Implementation Notes

### Authentication
- JWT token-based authentication stored in localStorage
- Automatic token injection via Axios interceptors
- 401 errors trigger automatic logout and redirect
- User state management through `User.me()` calls

### Performance Patterns
- Loading states with Skeleton components from shadcn/ui
- Optimistic UI updates where possible
- API response caching at component level

### Error Handling
- Try/catch blocks for async operations
- Console.error for development debugging
- Graceful degradation for API failures
- Axios interceptors handle global error cases

### Backend Integration
- RESTful API endpoints expected for all entities
- Standard HTTP methods: GET, POST, PUT, DELETE
- JSON request/response format
- File uploads via multipart form data

When extending this codebase:
- Follow the existing premium design patterns
- Use the established API entity patterns
- Leverage custom API client for all data operations
- Maintain responsive design principles
- Test dark/light mode compatibility
- Ensure proper error handling for all API calls
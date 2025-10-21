#!/bin/bash

################################################################################
# Roster86 Deployment Script
# Comprehensive deployment automation for production environments
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BACKUP=${SKIP_BACKUP:-false}
DEPLOY_FRONTEND=${DEPLOY_FRONTEND:-true}
DEPLOY_BACKEND=${DEPLOY_BACKEND:-true}
DOCKER_DEPLOY=${DOCKER_DEPLOY:-false}

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           Roster86 Deployment Script v2.0                 ║"
    echo "║                                                            ║"
    echo "║  Environment: $ENVIRONMENT"
    echo "║  Frontend: $DEPLOY_FRONTEND | Backend: $DEPLOY_BACKEND"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

check_requirements() {
    log_info "Checking system requirements..."

    local missing_deps=()

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node (v18+)")
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js version must be 18 or higher (found: $(node -v))"
            exit 1
        fi
        log_success "Node.js $(node -v) installed"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        log_success "npm $(npm -v) installed"
    fi

    # Check Python (for backend)
    if [ "$DEPLOY_BACKEND" = true ]; then
        if ! command -v python3 &> /dev/null; then
            missing_deps+=("python3 (v3.11+)")
        else
            PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
            log_success "Python $PYTHON_VERSION installed"
        fi

        # Check pip
        if ! command -v pip3 &> /dev/null; then
            missing_deps+=("pip3")
        else
            log_success "pip3 installed"
        fi
    fi

    # Check Docker (optional)
    if [ "$DOCKER_DEPLOY" = true ]; then
        if ! command -v docker &> /dev/null; then
            missing_deps+=("docker")
        else
            log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed"
        fi
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    else
        log_success "Git installed"
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi

    log_success "All system requirements met"
}

validate_environment() {
    log_info "Validating environment configuration..."

    local env_file="shiftwizard/backend/.env.$ENVIRONMENT"

    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        log_info "Please copy .env.production.example to .env.production and configure"
        exit 1
    fi

    # Load environment variables
    set -a
    source "$env_file"
    set +a

    # Critical environment variables to check
    local required_vars=(
        "JWT_SECRET"
        "NODE_ENV"
        "PORT"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables in $env_file:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    # Validate JWT_SECRET is not default
    if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
        log_error "JWT_SECRET must be changed from default value"
        exit 1
    fi

    log_success "Environment configuration validated"
}

backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping database backup (SKIP_BACKUP=true)"
        return
    fi

    log_info "Creating database backup..."

    local backup_dir="shiftwizard/backend/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)

    mkdir -p "$backup_dir"

    # Backup SQLite database if it exists
    if [ -f "shiftwizard/backend/database.sqlite" ]; then
        cp "shiftwizard/backend/database.sqlite" "$backup_dir/database_$timestamp.sqlite"
        log_success "SQLite database backed up to $backup_dir/database_$timestamp.sqlite"
    fi

    # TODO: Add PostgreSQL backup if using remote database
    # pg_dump $DATABASE_URL > "$backup_dir/postgres_$timestamp.sql"

    # Keep only last 10 backups
    ls -t "$backup_dir"/database_*.sqlite 2>/dev/null | tail -n +11 | xargs -r rm

    log_success "Database backup completed"
}

install_dependencies() {
    log_info "Installing dependencies..."

    # Install frontend dependencies
    if [ "$DEPLOY_FRONTEND" = true ]; then
        log_info "Installing frontend dependencies..."
        cd shiftwizard
        npm ci --production=false
        cd ..
        log_success "Frontend dependencies installed"
    fi

    # Install backend dependencies
    if [ "$DEPLOY_BACKEND" = true ]; then
        log_info "Installing backend dependencies..."
        cd shiftwizard/backend
        npm ci --production

        # Install Python dependencies
        if [ -f "requirements.txt" ]; then
            pip3 install -r requirements.txt
        else
            pip3 install ortools numpy
        fi

        cd ../..
        log_success "Backend dependencies installed"
    fi

    log_success "All dependencies installed"
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests (SKIP_TESTS=true)"
        return
    fi

    log_info "Running tests..."

    cd shiftwizard

    # Run linter
    if npm run lint --if-present; then
        log_success "Linting passed"
    else
        log_error "Linting failed"
        exit 1
    fi

    # Run unit tests
    if npm test --if-present; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi

    cd ..

    log_success "All tests passed"
}

build_frontend() {
    if [ "$DEPLOY_FRONTEND" = false ]; then
        log_info "Skipping frontend build"
        return
    fi

    log_info "Building frontend..."

    cd shiftwizard

    # Clean previous build
    rm -rf dist

    # Build
    npm run build

    if [ ! -d "dist" ]; then
        log_error "Frontend build failed - dist directory not created"
        exit 1
    fi

    cd ..

    log_success "Frontend built successfully"
}

initialize_database() {
    if [ "$DEPLOY_BACKEND" = false ]; then
        return
    fi

    log_info "Initializing/migrating database..."

    cd shiftwizard/backend

    # Run database initialization
    if [ -f "scripts/init-db.js" ]; then
        node scripts/init-db.js
        log_success "Database initialized"
    fi

    cd ../..
}

deploy_docker() {
    log_info "Deploying with Docker..."

    local image_name="roster86-backend"
    local container_name="roster86-backend"
    local timestamp=$(date +%Y%m%d_%H%M%S)

    # Stop existing container
    if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_info "Stopping existing container..."
        docker stop "$container_name" || true
        docker rm "$container_name" || true
    fi

    # Build new image
    log_info "Building Docker image..."
    cd shiftwizard
    docker build -t "${image_name}:${timestamp}" -t "${image_name}:latest" .

    # Run new container
    log_info "Starting new container..."
    docker run -d \
        --name "$container_name" \
        -p 3001:3001 \
        -v "$(pwd)/backend/database.sqlite:/app/backend/database.sqlite" \
        -v "$(pwd)/backend/logs:/app/backend/logs" \
        --env-file "backend/.env.${ENVIRONMENT}" \
        --restart unless-stopped \
        "${image_name}:latest"

    cd ..

    log_success "Docker deployment completed"
}

deploy_traditional() {
    log_info "Deploying traditional (PM2/systemd)..."

    # Check if PM2 is installed
    if command -v pm2 &> /dev/null; then
        log_info "Deploying with PM2..."

        cd shiftwizard/backend

        # Stop existing process
        pm2 stop roster86-backend || true
        pm2 delete roster86-backend || true

        # Start new process
        pm2 start server.js \
            --name roster86-backend \
            --env ${ENVIRONMENT} \
            --instances 1 \
            --max-memory-restart 512M

        pm2 save

        cd ../..

        log_success "PM2 deployment completed"
    else
        log_warning "PM2 not installed, starting with node..."

        cd shiftwizard/backend

        # Create start script
        cat > start.sh <<EOF
#!/bin/bash
export NODE_ENV=${ENVIRONMENT}
node server.js
EOF
        chmod +x start.sh

        log_info "To start the server, run: cd shiftwizard/backend && ./start.sh"

        cd ../..
    fi
}

deploy_frontend_vercel() {
    if [ "$DEPLOY_FRONTEND" = false ]; then
        return
    fi

    log_info "Deploying frontend to Vercel..."

    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not installed. Install with: npm i -g vercel"
        log_info "Frontend built to shiftwizard/dist - deploy manually"
        return
    fi

    cd shiftwizard

    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel
    fi

    cd ..

    log_success "Frontend deployed to Vercel"
}

verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for server to start
    sleep 5

    # Check backend health endpoint
    if [ "$DEPLOY_BACKEND" = true ]; then
        local backend_url="http://localhost:${PORT:-3001}"

        log_info "Checking backend health at ${backend_url}/api/health"

        if curl -f -s "${backend_url}/api/health" > /dev/null; then
            log_success "Backend health check passed"

            # Show detailed health
            curl -s "${backend_url}/api/health/detailed" | python3 -m json.tool || true
        else
            log_error "Backend health check failed"
            log_info "Check logs: shiftwizard/backend/logs/"
            exit 1
        fi
    fi

    log_success "Deployment verification completed"
}

show_deployment_info() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Deployment Completed Successfully            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Backend: http://localhost:${PORT:-3001}"
    log_info "Health Check: http://localhost:${PORT:-3001}/api/health/detailed"

    if [ "$DEPLOY_FRONTEND" = true ] && [ ! "$DOCKER_DEPLOY" = true ]; then
        log_info "Frontend: Built to shiftwizard/dist/"
    fi

    echo ""
    log_info "Logs: shiftwizard/backend/logs/"

    if command -v pm2 &> /dev/null; then
        log_info "PM2 Status: pm2 status"
        log_info "PM2 Logs: pm2 logs roster86-backend"
    fi

    if [ "$DOCKER_DEPLOY" = true ]; then
        log_info "Docker Logs: docker logs roster86-backend -f"
    fi

    echo ""
}

rollback() {
    log_error "Deployment failed! Rolling back..."

    # Restore database from backup
    local backup_dir="shiftwizard/backend/backups"
    local latest_backup=$(ls -t "$backup_dir"/database_*.sqlite 2>/dev/null | head -n1)

    if [ -n "$latest_backup" ]; then
        log_info "Restoring database from $latest_backup"
        cp "$latest_backup" "shiftwizard/backend/database.sqlite"
        log_success "Database restored"
    fi

    # Restart with previous version
    if command -v pm2 &> /dev/null; then
        pm2 restart roster86-backend || true
    fi

    log_error "Rollback completed. Please check the error messages above."
    exit 1
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    # Set up error trap
    trap rollback ERR

    print_banner

    # Pre-deployment checks
    check_requirements
    validate_environment

    # Backup
    backup_database

    # Install & Build
    install_dependencies
    run_tests
    build_frontend
    initialize_database

    # Deploy
    if [ "$DOCKER_DEPLOY" = true ]; then
        deploy_docker
    else
        deploy_traditional
        deploy_frontend_vercel
    fi

    # Post-deployment
    verify_deployment
    show_deployment_info

    log_success "Deployment completed successfully! 🚀"
}

################################################################################
# Usage and Help
################################################################################

show_help() {
    cat <<EOF
Roster86 Deployment Script

Usage: ./deploy.sh [OPTIONS]

Options:
    -h, --help              Show this help message
    -e, --environment ENV   Set environment (production|staging|development)
                           Default: production
    -f, --frontend-only     Deploy frontend only
    -b, --backend-only      Deploy backend only
    -d, --docker           Use Docker deployment
    --skip-tests           Skip running tests
    --skip-backup          Skip database backup

Environment Variables:
    ENVIRONMENT            Deployment environment
    SKIP_TESTS            Skip tests (true|false)
    SKIP_BACKUP           Skip backup (true|false)
    DEPLOY_FRONTEND       Deploy frontend (true|false)
    DEPLOY_BACKEND        Deploy backend (true|false)
    DOCKER_DEPLOY         Use Docker (true|false)

Examples:
    # Full production deployment
    ./deploy.sh

    # Deploy to staging
    ./deploy.sh --environment staging

    # Deploy backend only with Docker
    ./deploy.sh --backend-only --docker

    # Quick deploy without tests
    ./deploy.sh --skip-tests

    # Frontend only to Vercel
    ./deploy.sh --frontend-only

For more information, see:
    - PRODUCTION_READY_CHECKLIST.md
    - shiftwizard/DEPLOYMENT_INSTRUCTIONS.md
EOF
}

################################################################################
# Parse Command Line Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--frontend-only)
            DEPLOY_BACKEND=false
            DEPLOY_FRONTEND=true
            shift
            ;;
        -b|--backend-only)
            DEPLOY_FRONTEND=false
            DEPLOY_BACKEND=true
            shift
            ;;
        -d|--docker)
            DOCKER_DEPLOY=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main deployment
main

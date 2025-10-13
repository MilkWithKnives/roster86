-- ShiftWizard Enterprise Database Schema
-- PostgreSQL 14+ Required

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For compound indexes

-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'admin', 'manager', 'employee');
CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'cancelled', 'trial');
CREATE TYPE license_type AS ENUM ('trial', 'basic', 'professional', 'enterprise');
CREATE TYPE shift_status AS ENUM ('draft', 'published', 'in_progress', 'completed', 'cancelled');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push', 'in_app');

-- Organizations table (tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    license_key VARCHAR(255) UNIQUE NOT NULL,
    license_type license_type NOT NULL DEFAULT 'trial',
    license_expires_at TIMESTAMP WITH TIME ZONE,
    license_seats INTEGER NOT NULL DEFAULT 10,
    seats_used INTEGER NOT NULL DEFAULT 0,
    max_locations INTEGER NOT NULL DEFAULT 1,
    
    -- Stripe billing
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50),
    billing_email VARCHAR(255),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Audit fields
    status organization_status DEFAULT 'trial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_seats CHECK (seats_used <= license_seats),
    CONSTRAINT valid_license_dates CHECK (license_expires_at > created_at)
);

-- Create indexes for organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_license_key ON organizations(license_key);
CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Locations table (for multi-location support)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(50),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_locations_org ON locations(organization_id) WHERE deleted_at IS NULL;

-- Users table with organization relationship
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'employee',
    
    -- Multi-location support
    location_ids UUID[] DEFAULT '{}',
    default_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    -- Security
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_backup_codes TEXT[],
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Session management
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Permissions and settings
    permissions JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Employee specific fields
    employee_id VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    hourly_rate DECIMAL(10,2),
    overtime_rate DECIMAL(10,2),
    max_hours_per_week INTEGER DEFAULT 40,
    min_hours_per_week INTEGER DEFAULT 0,
    skills JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    availability JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, employee_id)
);

-- Create indexes for users
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(organization_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_location ON users USING GIN(location_ids);

-- API Keys table for programmatic access
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 7 chars for identification
    permissions JSONB DEFAULT '{}',
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE revoked_at IS NULL;

-- Shift templates
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    
    -- Time settings
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    break_minutes INTEGER DEFAULT 0,
    
    -- Requirements
    min_employees INTEGER DEFAULT 1,
    max_employees INTEGER,
    required_skills JSONB DEFAULT '[]',
    required_certifications JSONB DEFAULT '[]',
    
    -- Display
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_shift_templates_org ON shift_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shift_templates_location ON shift_templates(location_id) WHERE deleted_at IS NULL;

-- Schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Metrics
    total_hours DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    coverage_score INTEGER DEFAULT 0,
    
    -- Status
    status shift_status DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    notes TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_schedule_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_schedules_org ON schedules(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_dates ON schedules(organization_id, start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_status ON schedules(organization_id, status) WHERE deleted_at IS NULL;

-- Shifts table (individual shift assignments)
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
    
    -- Assignment
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time
    date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    
    -- Actual time tracking
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    actual_break_minutes INTEGER,
    
    -- Status
    status shift_status DEFAULT 'draft',
    
    -- Cost
    hourly_rate DECIMAL(10,2),
    total_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (break_minutes::DECIMAL / 60)
    ) STORED,
    total_cost DECIMAL(10,2),
    
    -- Notes
    notes TEXT,
    manager_notes TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shifts_org ON shifts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_user ON shifts(user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_date ON shifts(organization_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_schedule ON shifts(schedule_id) WHERE deleted_at IS NULL;

-- Time off requests
CREATE TABLE time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    type VARCHAR(50) NOT NULL, -- vacation, sick, personal, etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    all_day BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    
    -- Approval
    status request_status DEFAULT 'pending',
    reason TEXT,
    notes TEXT,
    
    -- Approval chain
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_off_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_time_off_org ON time_off_requests(organization_id);
CREATE INDEX idx_time_off_user ON time_off_requests(user_id);
CREATE INDEX idx_time_off_dates ON time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_status ON time_off_requests(organization_id, status);

-- Shift swap requests
CREATE TABLE shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Original shift
    original_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    original_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Target
    target_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE, -- NULL for drop requests
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status
    status request_status DEFAULT 'pending',
    reason TEXT,
    
    -- Approval
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_swap_requests_org ON shift_swap_requests(organization_id);
CREATE INDEX idx_swap_requests_status ON shift_swap_requests(organization_id, status);

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type notification_type NOT NULL,
    category VARCHAR(50) NOT NULL, -- shift_reminder, schedule_published, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- Audit logs table (partitioned by month)
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the next 12 months
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs
             FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
        
        -- Create index on partition
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_%I_org ON %I(organization_id)',
            partition_name,
            partition_name
        );
        
        start_date := end_date;
    END LOOP;
END $$;

-- License keys table
CREATE TABLE license_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(255) UNIQUE NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    
    -- License details
    type license_type NOT NULL,
    seats INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}',
    
    -- Validity
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    validation_count INTEGER DEFAULT 0,
    last_validation_ip INET,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_license_keys_hash ON license_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_license_keys_org ON license_keys(organization_id);

-- Sessions table for managing user sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE,
    
    -- Device/browser info
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    
    -- Validity
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_token ON sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token_hash) WHERE revoked_at IS NULL;

-- Create views for common queries

-- Active users view
CREATE VIEW active_users AS
SELECT 
    u.*,
    o.name as organization_name,
    o.slug as organization_slug
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.deleted_at IS NULL 
    AND o.deleted_at IS NULL 
    AND o.status = 'active';

-- Upcoming shifts view
CREATE VIEW upcoming_shifts AS
SELECT 
    s.*,
    u.full_name as employee_name,
    u.email as employee_email,
    l.name as location_name
FROM shifts s
JOIN users u ON s.user_id = u.id
LEFT JOIN locations l ON s.location_id = l.id
WHERE s.deleted_at IS NULL 
    AND s.date >= CURRENT_DATE 
    AND s.status IN ('published', 'draft');

-- Create functions for common operations

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;

-- Function to validate license limits
CREATE OR REPLACE FUNCTION check_license_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_seats INTEGER;
    max_seats INTEGER;
BEGIN
    SELECT seats_used, license_seats 
    INTO current_seats, max_seats
    FROM organizations 
    WHERE id = NEW.organization_id;
    
    IF current_seats >= max_seats THEN
        RAISE EXCEPTION 'License seat limit reached';
    END IF;
    
    -- Update seats_used count
    UPDATE organizations 
    SET seats_used = seats_used + 1 
    WHERE id = NEW.organization_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_user_license_limits
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION check_license_limits();

-- Row Level Security Policies

-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for users table)
CREATE POLICY users_isolation ON users
    FOR ALL
    USING (organization_id = current_setting('app.current_organization')::UUID);

CREATE POLICY users_super_admin ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.current_user')::UUID 
            AND role = 'super_admin'
        )
    );

-- Performance indexes for common queries
CREATE INDEX idx_shifts_upcoming ON shifts(date, start_time) 
    WHERE deleted_at IS NULL AND date >= CURRENT_DATE;

CREATE INDEX idx_users_search ON users USING GIN(
    to_tsvector('english', full_name || ' ' || COALESCE(email, ''))
);

-- Statistics tracking table
CREATE TABLE usage_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Metrics
    active_users INTEGER DEFAULT 0,
    shifts_created INTEGER DEFAULT 0,
    schedules_published INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, date)
);

CREATE INDEX idx_usage_stats_org_date ON usage_statistics(organization_id, date DESC);

-- Grants for application user (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO shiftwizard_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO shiftwizard_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO shiftwizard_app;
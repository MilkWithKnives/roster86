# ShiftWizard Enterprise Architecture Migration Plan

## Overview
Transforming ShiftWizard from a single-tenant SQLite application to a multi-tenant, enterprise-grade SaaS platform capable of serving 10,000+ organizations.

## Current Architecture Issues
- **SQLite**: Cannot handle concurrent writes, not suitable for production
- **Single-tenant**: No organization/workspace isolation
- **No caching layer**: Direct DB hits will kill performance
- **No queue system**: Synchronous operations will bottleneck
- **Security gaps**: Missing rate limiting, audit logs, encryption at rest
- **No horizontal scaling**: Current architecture can't scale beyond one server

## Target Architecture

### 1. Database Layer
**Primary Database: PostgreSQL**
- Multi-tenant with Row Level Security (RLS)
- Read replicas for scaling
- Connection pooling with PgBouncer
- Automatic failover with streaming replication

**Migration Strategy:**
```sql
-- Organizations table (tenant isolation)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    license_key VARCHAR(255) UNIQUE NOT NULL,
    license_type VARCHAR(50) NOT NULL, -- trial, basic, professional, enterprise
    license_expires_at TIMESTAMP,
    max_users INTEGER NOT NULL DEFAULT 10,
    max_locations INTEGER NOT NULL DEFAULT 1,
    settings JSONB DEFAULT '{}',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- soft delete
);

-- Users table (with organization relationship)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- owner, admin, manager, employee
    permissions JSONB DEFAULT '{}',
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(organization_id, email)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
-- ... for all tables
```

### 2. Caching Layer
**Redis Cluster**
- Session management
- API rate limiting per organization
- Real-time presence tracking
- Temporary data storage
- Pub/Sub for real-time updates

### 3. Message Queue
**RabbitMQ or AWS SQS**
- Email notifications
- SMS notifications
- Webhook deliveries
- Report generation
- Data exports
- License validation checks

### 4. Application Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
│                  (AWS ALB/Nginx)                     │
└────────────┬───────────────────────┬────────────────┘
             │                       │
    ┌────────▼─────────┐   ┌────────▼─────────┐
    │   API Server 1   │   │   API Server 2   │  ... N
    │   (Node.js)      │   │   (Node.js)      │
    └────────┬─────────┘   └────────┬─────────┘
             │                       │
    ┌────────▼───────────────────────▼────────────────┐
    │            Redis Cluster (Cache)                │
    └────────────────────┬─────────────────────────────┘
                         │
    ┌────────────────────▼─────────────────────────────┐
    │          PostgreSQL Primary                       │
    │            (Write Operations)                     │
    └───────┬────────────────────────┬─────────────────┘
            │                        │
    ┌───────▼──────┐         ┌──────▼───────┐
    │ Read Replica │         │ Read Replica │
    └──────────────┘         └──────────────┘
```

### 5. Security Implementation

#### License Key System
```javascript
// License key format: SHIFT-XXXX-XXXX-XXXX-XXXX
// Includes checksum validation and encryption

class LicenseManager {
    generateLicenseKey(organizationId, type, expiresAt) {
        // RSA signed license with embedded metadata
        const payload = {
            org: organizationId,
            type: type,
            exp: expiresAt,
            features: this.getFeaturesForType(type),
            seats: this.getSeatsForType(type)
        };
        return this.signAndEncode(payload);
    }
    
    validateLicense(key) {
        // Verify signature, check expiration, validate against DB
        // Cache validation results in Redis (5 min TTL)
    }
}
```

#### Multi-Factor Authentication
- TOTP (Time-based One-Time Password)
- Backup codes
- Optional SMS (Twilio integration)

#### API Rate Limiting
```javascript
// Per-organization limits based on license tier
const rateLimits = {
    trial: { requests: 1000, window: '1h' },
    basic: { requests: 5000, window: '1h' },
    professional: { requests: 20000, window: '1h' },
    enterprise: { requests: 100000, window: '1h' }
};
```

### 6. Monitoring & Observability

#### Application Monitoring
- **APM**: DataDog or New Relic
- **Error Tracking**: Sentry
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana

#### Health Checks
```javascript
// Health check endpoints
GET /health/live     - Basic liveness check
GET /health/ready    - Database, Redis, Queue connectivity
GET /health/metrics  - Prometheus metrics endpoint
```

### 7. Backup & Disaster Recovery

- **Database**: Daily automated backups, 30-day retention
- **Point-in-time recovery**: Up to 7 days
- **Geographic redundancy**: Multi-region backup storage
- **RTO**: 4 hours, **RPO**: 1 hour

### 8. Compliance & Audit

#### Audit Logging
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

#### GDPR Compliance
- Data export functionality
- Right to deletion
- Consent management
- Data retention policies

### 9. Performance Optimization

#### Database Optimizations
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read/write splitting
- Materialized views for reports

#### Application Optimizations
- Response compression
- CDN for static assets
- Lazy loading
- Database query batching
- Efficient pagination

### 10. Deployment Strategy

#### Infrastructure as Code
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  app:
    image: shiftwizard:latest
    replicas: 3
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### CI/CD Pipeline
1. Code push to GitHub
2. GitHub Actions triggers
3. Run tests (unit, integration, e2e)
4. Security scanning (SAST, dependency check)
5. Build Docker image
6. Push to registry
7. Blue-green deployment
8. Smoke tests
9. Traffic switch

## Implementation Phases

### Phase 1: Database Migration (Week 1-2)
- [ ] Set up PostgreSQL with proper schemas
- [ ] Implement organization/tenant model
- [ ] Add Row Level Security
- [ ] Migrate existing data

### Phase 2: Authentication & Security (Week 3-4)
- [ ] Implement license key system
- [ ] Add organization-based auth
- [ ] Implement MFA
- [ ] Add rate limiting

### Phase 3: Infrastructure (Week 5-6)
- [ ] Set up Redis cluster
- [ ] Implement caching layer
- [ ] Add message queue
- [ ] Configure monitoring

### Phase 4: API Migration (Week 7-8)
- [ ] Update all endpoints for multi-tenancy
- [ ] Add organization context middleware
- [ ] Implement proper error handling
- [ ] Add comprehensive logging

### Phase 5: Testing & Optimization (Week 9-10)
- [ ] Load testing (target: 10,000 concurrent users)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

### Phase 6: Deployment (Week 11-12)
- [ ] Set up production environment
- [ ] Configure auto-scaling
- [ ] Implement monitoring
- [ ] Go live with beta customers

## Cost Estimation (Monthly)

### Basic Setup (1,000 organizations)
- PostgreSQL RDS: $200
- Redis: $100
- EC2 instances (3x): $300
- Load Balancer: $25
- Backups & Storage: $50
- **Total: ~$675/month**

### Scale Setup (10,000 organizations)
- PostgreSQL RDS (Multi-AZ): $800
- Redis Cluster: $400
- EC2 instances (10x): $1,000
- Load Balancer: $25
- CDN: $100
- Backups & Storage: $200
- Monitoring: $200
- **Total: ~$2,725/month**

## Success Metrics
- 99.9% uptime SLA
- <200ms API response time (p95)
- Support for 10,000+ concurrent users
- Zero data loss incidents
- <5 minute recovery time for failures
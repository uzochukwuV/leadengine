# OpenCommerceLens SaaS Migration

## Priority: HIGH

---

## 1. Multi-Tenancy & Isolation ⚡

### 1.1 Database Schema
- [ ] Add `tenant_id` UUID to ALL tables
- [ ] Create `tenants` table (id, name, plan, stripe_customer_id, limits, created_at)
- [ ] Create `users` table (id, tenant_id, email, password_hash, role, created_at)
- [ ] Add indexes on `tenant_id`
- [ ] Create Row Level Security (RLS) policies

### 1.2 Concurrency (Non-Blocking) ⚡
- [ ] **Agent conversations must be isolated per tenant**
- [ ] **No blocking on shared resources**
- [ ] Use tenant-scoped message queues
- [ ] WebSocket connections per tenant session
- [ ] Concurrent webhook processing (no locks)
- [ ] Database connection pooling per tenant
- [ ] Event-driven architecture (not request-response blocking)
- [ ] Tenant-specific async workers

### 1.3 Tenant Isolation Checklist
- [ ] Each tenant's email inbox isolated
- [ ] Each tenant's Telegram bot isolated
- [ ] Each tenant's agent memory isolated
- [ ] Each tenant's campaign data isolated
- [ ] Cross-tenant data access = BLOCKED
- [ ] Tenant-scoped logging (no mixing)

---

## 2. Authentication & Authorization

### 2.1 Auth Provider (Choose One)
- [ ] Supabase Auth (email/password, OAuth)
- [ ] Clerk (email/password, OAuth, SSO)
- [ ] Auth.js (NextAuth)

### 2.2 User Management
- [ ] Signup flow with email verification
- [ ] Login / logout
- [ ] Password reset
- [ ] Email change
- [ ] Multi-user per tenant (based on plan)

### 2.3 Roles & Permissions
- [ ] Owner (full access)
- [ ] Admin (manage users)
- [ ] Member (limited access)
- [ ] Viewer (read-only)

---

## 3. Billing & Subscriptions

### 3.1 Plans
| Plan | Price | Limits |
|------|-------|--------|
| Free | $0 | 10 leads, 1 campaign, 50 emails/mo |
| Starter | $29/mo | 100 leads, 5 campaigns, 500 emails/mo |
| Pro | $99/mo | 1000 leads, unlimited campaigns, 5000 emails/mo |
| Enterprise | $299/mo | Unlimited everything |

### 3.2 Stripe Integration
- [ ] Create Stripe products & prices
- [ ] Checkout flow
- [ ] Subscription management
- [ ] Upgrade/downgrade flow
- [ ] Cancel subscription
- [ ] Webhook handlers:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_failed`

### 3.3 Usage Limits
- [ ] Track `leads_created` count
- [ ] Track `emails_sent` count
- [ ] Track `campaigns_created` count
- [ ] Block action when limit reached
- [ ] Show usage in dashboard

---

## 4. API Layer

### 4.1 REST Endpoints
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/tenants/:id
PATCH  /api/tenants/:id

GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id

GET    /api/campaigns
POST   /api/campaigns
POST   /api/campaigns/:id/send
GET    /api/campaigns/:id/stats

GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id/conversations

GET    /api/stats
GET    /api/activity

POST   /api/webhooks/stripe
POST   /api/webhooks/inbound-email
```

### 4.2 Rate Limiting
- [ ] Per-tenant rate limits
- [ ] Per-endpoint rate limits
- [ ] Rate limit headers in responses
- [ ] Rate limit exceeded handling

---

## 5. Frontend Dashboard

### 5.1 Pages
- [ ] Landing page
- [ ] Pricing page
- [ ] Signup page
- [ ] Login page
- [ ] Dashboard (main)
- [ ] Leads list
- [ ] Lead detail
- [ ] Campaigns list
- [ ] Campaign detail
- [ ] Settings (profile, API keys, team)
- [ ] Billing (subscription, invoices)

### 5.2 Components
- [ ] Navigation sidebar
- [ ] Data tables with filters
- [ ] Lead pipeline view
- [ ] Campaign analytics
- [ ] Usage meter
- [ ] Notification toasts

---

## 6. Agent Multi-Tenancy

### 6.1 Tenant-Scoped Agents
- [ ] Each tenant gets isolated agent instance
- [ ] Tenant-specific system prompts
- [ ] Tenant-specific tools
- [ ] Tenant-specific memory

### 6.2 Channel Isolation (Non-Blocking)
- [ ] Email: `tenant-{id}@outreach.example.com`
- [ ] Telegram: Separate bot per tenant (or bot token per tenant)
- [ ] Webhooks routed to correct tenant
- [ ] **Message queues per tenant (RabbitMQ/Redis)**

### 6.3 Message Processing (Concurrent)
- [ ] Non-blocking message queue per tenant
- [ ] Concurrent webhook processing
- [ ] No shared state between tenants
- [ ] **Event-driven: inbound → classify → respond (async)**
- [ ] **Worker pools per tenant**

---

## 7. Data & Compliance

### 7.1 GDPR
- [ ] EU data residency option
- [ ] Data export (GDPR)
- [ ] Data deletion (GDPR)
- [ ] Cookie consent

### 7.2 Security
- [ ] HTTPS everywhere
- [ ] CSP headers
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF tokens

### 7.3 Backup
- [ ] Daily database backups
- [ ] Point-in-time recovery
- [ ] Backup verification

---

## 8. Infrastructure

### 8.1 Hosting Options
| Option | Pros | Cons |
|--------|------|------|
| Vercel | Easy, fast | Cold starts |
| Railway | Good for Node | Pricey |
| Render | Simple | Slow deploys |
| AWS/GCP | Full control | Complex |

### 8.2 Database Options
| Option | Pros | Cons |
|--------|------|------|
| Supabase | Ready RLS, Auth | Managed |
| Neon | Serverless Postgres | Newer |
| PlanetScale | MySQL, branching | No FKs |
| Railway Postgres | Simple | Less features |

### 8.3 Required Services
- [ ] Domain + SSL
- [ ] Email service (Resend - already integrated)
- [ ] Search API (Tavily - already integrated)
- [ ] AI (OpenAI - already integrated)
- [ ] File storage (if needed)
- [ ] Redis/Queue (for concurrency)

---

## 9. Testing

### 9.1 Unit Tests
- [ ] API endpoint tests
- [ ] Database query tests
- [ ] Auth flow tests
- [ ] Billing webhook tests

### 9.2 Integration Tests
- [ ] Full user signup flow
- [ ] Lead creation pipeline
- [ ] Email sending flow
- [ ] Subscription upgrade flow

### 9.3 Multi-Tenant Tests
- [ ] Tenant A cannot see Tenant B data
- [ ] **Concurrent requests from multiple tenants**
- [ ] Rate limiting per tenant
- [ ] Resource limits per plan

---

## 10. Launch Checklist

### Pre-Launch
- [ ] All items above checked
- [ ] Documentation written
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Support email

### Soft Launch
- [ ] Invite beta users (5-10)
- [ ] Feedback collection
- [ ] Bug fixes
- [ ] Performance optimization

### Public Launch
- [ ] Marketing site
- [ ] Social media
- [ ] SEO setup
- [ ] Analytics (Plausible/Posthog)
- [ ] Error tracking (Sentry)

---

## Implementation Order

```
Week 1: Multi-Tenancy Schema
  ├─ tenants table
  ├─ users table
  ├─ Add tenant_id to all tables
  └─ Basic auth

Week 2: API Layer
  ├─ REST endpoints
  ├─ Auth middleware
  └─ Tenant isolation

Week 3: Billing
  ├─ Stripe integration
  ├─ Webhook handlers
  └─ Usage limits

Week 4: Frontend Dashboard
  ├─ Main dashboard
  ├─ Leads page
  └─ Campaigns page

Week 5-6: Polish
  ├─ Settings pages
  ├─ Multi-user support
  └─ Testing & bug fixes

Week 7-8: Launch
  ├─ Documentation
  ├─ Marketing
  └─ Soft launch
```

---

## Current Status

| Section | Status |
|---------|--------|
| Core Logic | ✅ Complete |
| Database Schema | ✅ Complete |
| Concurrency | ✅ Complete |
| Auth | ✅ Complete |
| Billing | ✅ Complete |
| API | ✅ Complete |
| Frontend | ❌ Not Started |

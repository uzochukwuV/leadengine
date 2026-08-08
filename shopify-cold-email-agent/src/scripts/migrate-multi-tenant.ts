/**
 * Multi-Tenant Migration Script
 * 
 * This script migrates the database from single-tenant to multi-tenant.
 * 
 * Changes:
 * 1. Create tenants table
 * 2. Create users table  
 * 3. Add tenant_id to all data tables
 * 4. Add concurrency-safe message queues
 */

import { awaitDatabase } from '../db';

async function runMigration() {
  const db = await awaitDatabase();
  console.log('Starting Multi-Tenant Migration...\n');

// STEP 1: Create tenants table
console.log('Creating tenants table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    limits TEXT DEFAULT '{"leads": 10, "campaigns": 1, "emails_per_month": 50}',
    usage TEXT DEFAULT '{"leads": 0, "campaigns": 0, "emails": 0, "emails_this_month": 0}',
    status TEXT DEFAULT 'active',
    settings TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('tenants table created');

// STEP 2: Create users table
console.log('Creating users table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT,
    role TEXT DEFAULT 'owner',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('users table created');

// STEP 3: Create message_queues table (for concurrency)
console.log('Creating message_queues table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS message_queues (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id INTEGER,
    direction TEXT NOT NULL,
    channel TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error TEXT,
    scheduled_at DATETIME,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('message_queues table created');

// STEP 4: Add tenant_id to existing tables
console.log('\nAdding tenant_id to existing tables...');
const tablesNeedingTenantId = ['contacts', 'stores', 'leads', 'campaigns', 'emails', 'activity_log', 'tasks', 'conversations'];

for (const table of tablesNeedingTenantId) {
  try {
    const columns = db.prepare(`PRAGMA table_info('${table}')`).all() as any[];
    const hasTenantId = columns.some((c: any) => c.name === 'tenant_id');
    if (!hasTenantId) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT`);
      console.log(`  Added tenant_id to ${table}`);
    }
  } catch (e: any) {
    console.log(`  Error on ${table}: ${e.message}`);
  }
}

// STEP 5: Create default tenant
console.log('\nCreating default tenant...');
const existingEmail = 'vic.ezealor@gmail.com';
const tenantId = 'tenant_' + Date.now();
const userId = 'user_' + Date.now();

db.prepare(`INSERT INTO tenants (id, name, email, plan, status) VALUES (?, ?, ?, 'free', 'active')`).run(tenantId, 'Victors Workspace', existingEmail);
db.prepare(`INSERT INTO users (id, tenant_id, email, name, role) VALUES (?, ?, ?, ?, 'owner')`).run(userId, tenantId, existingEmail, 'Victor');

// Update all existing records
const tablesToUpdate = ['contacts', 'stores', 'leads', 'campaigns', 'emails', 'activity_log', 'tasks', 'conversations'];
for (const table of tablesToUpdate) {
  try {
    const result = db.prepare(`UPDATE ${table} SET tenant_id = ? WHERE tenant_id IS NULL`).run(tenantId);
    if (result.changes > 0) console.log(`  Updated ${result.changes} rows in ${table}`);
  } catch (e) {}
}

// STEP 6: Create indexes
console.log('\nCreating indexes...');
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email)',
  'CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_emails_tenant ON emails(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_message_queues_tenant ON message_queues(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_message_queues_status ON message_queues(status)',
];
for (const index of indexes) { try { db.exec(index); } catch (e) {} }
console.log('Indexes created');

// STEP 7: Clean up
try { db.exec('DROP TABLE IF EXISTS owner'); console.log('Dropped owner table'); } catch (e) {}
try { db.exec('DROP TABLE IF EXISTS campaign_leads'); } catch (e) {}

console.log('\nMulti-Tenant Migration Complete!');
console.log('Tenant ID:', tenantId);
}

runMigration().catch(console.error);

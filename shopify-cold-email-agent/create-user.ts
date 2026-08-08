/**
 * Create User Script
 * Usage: npx tsx create-user.ts <email> <password> [name]
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + (process.env.PASSWORD_SALT || 'change-this-to-another-random-string')).digest('hex');
}

const [,, email, password, ...nameParts] = process.argv;
if (!email || !password) {
  console.log('Usage: npx tsx create-user.ts <email> <password> [name]');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

if (data.users.find((u: any) => u.email === email)) {
  console.log(`User ${email} already exists!`);
  process.exit(1);
}

const tenantId = 'tenant_' + Date.now();
const userId = 'user_' + Date.now();
const name = nameParts.join(' ') || email.split('@')[0];

data.tenants.push({
  id: tenantId,
  name: name + "'s Workspace",
  email,
  plan: 'starter',
  status: 'active',
  created_at: new Date().toISOString()
});

data.users.push({
  id: userId,
  tenant_id: tenantId,
  email,
  password_hash: hashPassword(password),
  name,
  role: 'owner',
  created_at: new Date().toISOString()
});

data.settings.push({
  tenant_id: tenantId,
  from_email: email,
  from_name: name,
  company_name: 'Your Company',
  timezone: 'UTC',
  updated_at: new Date().toISOString()
});

fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
console.log(`Created user: ${email}`);
console.log(`Tenant: ${tenantId}`);
console.log(`Password: ${password}`);

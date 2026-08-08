/**
 * Database wrapper using JSON file storage
 * Works on Vercel serverless functions
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'db.json');

interface DbData {
  users: any[];
  stores: any[];
  leads: any[];
  contacts: any[];
  campaigns: any[];
  emails: any[];
  activity_log: any[];
  settings: any[];
  tenants: any[];
  counters: { [key: string]: number };
}

let data: DbData = {
  users: [],
  stores: [],
  leads: [],
  contacts: [],
  campaigns: [],
  emails: [],
  activity_log: [],
  settings: [],
  tenants: [],
  counters: {}
};

// Load/save functions
function loadDb(): void {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      data = JSON.parse(content);
      // Ensure all tables exist
      if (!data.tenants) data.tenants = [];
      if (!data.counters) data.counters = {};
    }
  } catch (e) {
    data = { users: [], stores: [], leads: [], contacts: [], campaigns: [], emails: [], activity_log: [], settings: [], tenants: [], counters: {} };
  }
}

function saveDb(): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    // Ignore save errors in serverless
  }
}

// Replace placeholders
function replaceParams(sql: string, params: any[]): string {
  let result = sql;
  params.forEach(p => {
    result = result.replace(/\?/, typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : String(p));
  });
  return result;
}

// Prepared statement wrapper
class Statement {
  constructor(private sql: string) {}

  all(...params: any[]): any[] {
    const sql = replaceParams(this.sql, params);
    
    // Parse SELECT queries
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    
    if (!fromMatch) return [];
    
    const tableName = fromMatch[1].toLowerCase();
    const table = data[tableName as keyof DbData] as any[];
    if (!table) return [];
    
    let results: any[] = [...table];
    
    // Apply WHERE clause
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      results = results.filter(row => {
        const match = whereClause.match(/(\w+)\s*=\s*(.+)/);
        if (match) {
          const field = match[1];
          let value = match[2].replace(/'/g, '').trim();
          // Try number
          const numValue = Number(value);
          return row[field] == value || (numValue && row[field] == numValue);
        }
        return true;
      });
    }
    
    // Apply ORDER
    if (orderMatch) {
      const field = orderMatch[1];
      const desc = orderMatch[2]?.toUpperCase() === 'DESC';
      results.sort((a, b) => {
        if (desc) return (b[field] || '') > (a[field] || '') ? 1 : -1;
        return (a[field] || '') > (b[field] || '') ? 1 : -1;
      });
    }
    
    // Apply LIMIT
    if (limitMatch) {
      results = results.slice(0, parseInt(limitMatch[1]));
    }
    
    return results;
  }

  get(...params: any[]): any {
    const sql = replaceParams(this.sql, params);
    
    // Handle COUNT queries
    const countMatch = sql.match(/COUNT\(\*\)\s+AS\s+(\w+)/i);
    if (countMatch) {
      const allResults: any[] = this.all(...params);
      return { [countMatch[1]]: allResults.length };
    }
    
    const results = this.all(...params);
    return results[0] || null;
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    const sqlLower = this.sql.toLowerCase().trim();
    
    // INSERT
    if (sqlLower.startsWith('insert')) {
      const intoMatch = this.sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i);
      if (!intoMatch) return { changes: 0, lastInsertRowid: 0 };
      
      const tableName = intoMatch[1].toLowerCase();
      const columns = intoMatch[2].split(',').map(c => c.trim());
      const table = data[tableName as keyof DbData] as any[];
      if (!table) return { changes: 0, lastInsertRowid: 0 };
      
      const newId = (data.counters[tableName] || 0) + 1;
      data.counters[tableName] = newId;
      
      const obj: any = { id: newId, created_at: new Date().toISOString() };
      columns.forEach((col, i) => {
        obj[col] = params[i];
      });
      
      table.push(obj);
      saveDb();
      return { changes: 1, lastInsertRowid: newId };
    }
    
    // UPDATE
    if (sqlLower.startsWith('update')) {
      const tableMatch = this.sql.match(/UPDATE\s+(\w+)/i);
      const setMatch = this.sql.match(/SET\s+(.+?)\s+WHERE/i);
      const whereMatch = this.sql.match(/WHERE\s+(.+)/i);
      
      if (!tableMatch || !whereMatch) return { changes: 0, lastInsertRowid: 0 };
      
      const tableName = tableMatch[1].toLowerCase();
      const table = data[tableName as keyof DbData] as any[];
      if (!table) return { changes: 0, lastInsertRowid: 0 };
      
      const whereField = whereMatch[1].split('=')[0].trim();
      const whereValue = whereMatch[1].split('=')[1].trim().replace(/'/g, '');
      
      const row = table.find(r => String(r[whereField]) === whereValue);
      if (row) {
        if (setMatch) {
          const setParts = setMatch[1].split(',');
          setParts.forEach(part => {
            const [field, value] = part.split('=').map(s => s.trim());
            row[field] = value.replace(/'/g, '');
          });
        }
        row.updated_at = new Date().toISOString();
        saveDb();
        return { changes: 1, lastInsertRowid: 0 };
      }
      return { changes: 0, lastInsertRowid: 0 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }
}

// Initialize
loadDb();

// Create default user if not exists
if (!data.users.find(u => u.email === 'test@example.com')) {
  data.tenants.push({
    id: 'tenant_test123',
    name: 'Test Workspace',
    email: 'test@example.com',
    plan: 'starter',
    status: 'active',
    created_at: new Date().toISOString()
  });
  // Hash password using the same method as auth.ts
  const passwordHash = crypto.createHash('sha256').update('password123' + (process.env.PASSWORD_SALT || 'change-me')).digest('hex');
  data.users.push({
    id: 'user_test1',
    tenant_id: 'tenant_test123',
    email: 'test@example.com',
    password_hash: passwordHash,
    name: 'Test User',
    role: 'owner',
    created_at: new Date().toISOString()
  });
  data.settings.push({
    tenant_id: 'tenant_test123',
    from_email: 'outreach@example.com',
    from_name: 'OpenCommerceLens',
    company_name: 'Your Company',
    timezone: 'UTC',
    updated_at: new Date().toISOString()
  });
  data.counters = { users: 1, tenants: 1, stores: 0, leads: 0, campaigns: 0, emails: 0 };
  saveDb();
}

// Sync interface
export function getDatabase() {
  return {
    prepare: (sql: string) => new Statement(sql),
    exec: (_sql?: string) => saveDb()
  };
}

export async function awaitDatabase() {
  loadDb();
  return getDatabase();
}

export { Statement };

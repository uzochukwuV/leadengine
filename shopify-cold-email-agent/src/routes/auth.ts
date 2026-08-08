/**
 * Auth Routes - JWT-based authentication
 */
import { Router } from 'express';
import * as crypto from 'crypto';
import { getDatabase } from '../db';

const router = Router();
const db = getDatabase();

function createToken(userId: string, tenantId: string): string {
  const payload = { userId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'change-me').update(base64).digest('base64');
  return base64 + '.' + sig;
}

function verifyToken(token: string): { userId: string; tenantId: string } | null {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'change-me').update(payload).digest('base64');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, tenantId: data.tenantId };
  } catch { return null; }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + (process.env.PASSWORD_SALT || 'change-me')).digest('hex');
}

router.post('/signup', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const tenantId = 'tenant_' + Date.now();
  const userId = 'user_' + Date.now();
  const passwordHash = hashPassword(password);
  db.prepare('INSERT INTO tenants (id, name, email, plan) VALUES (?, ?, ?, ?)').run(tenantId, name || email.split('@')[0], email, 'free');
  db.prepare('INSERT INTO users (id, tenant_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(userId, tenantId, email, name || null, passwordHash, 'owner');
  const token = createToken(userId, tenantId);
  res.json({ success: true, token, user: { id: userId, email, name, role: 'owner' }, tenant: { id: tenantId, name: name || email, plan: 'free' } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.password_hash !== hashPassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);
  const token = createToken(user.id, user.tenant_id);
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id) as any;
  res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan } });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  const userData = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(user.userId) as any;
  const tenant = db.prepare('SELECT id, name, email, plan FROM tenants WHERE id = ?').get(user.tenantId) as any;
  res.json({ user: userData, tenant });
});

router.post('/reset-password', (req, res) => {
  res.json({ success: true, message: 'Reset link sent if email exists' });
});

export { verifyToken, createToken };
export default router;

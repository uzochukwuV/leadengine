/**
 * OpenCommerceLens API Server
 */
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import billingRoutes from './routes/billing';
import toolsRoutes from './routes/tools';
import { verifyToken } from './routes/auth';
import { awaitDatabase, getDatabase } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
awaitDatabase().then(() => console.log('[DB] Initialized'));

// Middleware
app.use(cors());
app.use(express.json());

// Tenant middleware
app.use((req: any, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      req.tenantId = user.tenantId;
      req.userId = user.userId;
    }
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/tools', toolsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get db reference
const db = getDatabase();

app.get('/api/leads', (req: any, res) => {
  if (!req.tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const leads = db.prepare(`
    SELECT l.*, s.name as store_name 
    FROM leads l 
    LEFT JOIN stores s ON l.store_id = s.id 
    WHERE l.tenant_id = ? 
    ORDER BY l.created_at DESC
  `).all(req.tenantId);
  res.json({ leads });
});

app.get('/api/contacts', (req: any, res) => {
  if (!req.tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const contacts = db.prepare('SELECT * FROM contacts WHERE tenant_id = ? ORDER BY created_at DESC').all(req.tenantId);
  res.json({ contacts });
});

app.get('/api/campaigns', (req: any, res) => {
  if (!req.tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const campaigns = db.prepare('SELECT * FROM campaigns WHERE tenant_id = ? ORDER BY created_at DESC').all(req.tenantId);
  res.json({ campaigns });
});

app.get('/api/stores', (req: any, res) => {
  if (!req.tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const stores = db.prepare('SELECT * FROM stores WHERE tenant_id = ? ORDER BY discovered_at DESC').all(req.tenantId);
  res.json({ stores });
});

app.get('/api/stats', (req: any, res) => {
  if (!req.tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const stats = {
    leads: db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(req.tenantId).c,
    stores: db.prepare('SELECT COUNT(*) as c FROM stores WHERE tenant_id = ?').get(req.tenantId).c,
    contacts: db.prepare('SELECT COUNT(*) as c FROM contacts WHERE tenant_id = ?').get(req.tenantId).c,
    campaigns: db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?').get(req.tenantId).c,
    emails: db.prepare("SELECT COUNT(*) as c FROM emails WHERE tenant_id = ? AND direction = 'outbound'").get(req.tenantId).c,
    interested: db.prepare("SELECT COUNT(*) as c FROM leads WHERE tenant_id = ? AND status = 'interested'").get(req.tenantId).c,
    unsubscribed: db.prepare("SELECT COUNT(*) as c FROM leads WHERE tenant_id = ? AND status = 'unsubscribed'").get(req.tenantId).c
  };
  res.json({ stats });
});

app.listen(PORT, () => {
  console.log(`OpenCommerceLens API running on port ${PORT}`);
});

export default app;

/**
 * Tools Routes - Lead discovery, email sending, etc.
 */
import { Router } from 'express';
import { getDatabase } from '../db';

const router = Router();
const db = getDatabase();

// ============================================
// HELPERS
// ============================================
function getTenantId(req: any): string {
  return req.headers['x-tenant-id'] || req.tenantId || '';
}

function checkLimit(tenantId: string, type: 'leads' | 'campaigns' | 'emails'): boolean {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
  if (!tenant) return false;
  const limits = JSON.parse(tenant.limits || '{}');
  
  if (type === 'leads') {
    const count = db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId).c;
    return count < limits.leads;
  }
  if (type === 'campaigns') {
    const count = db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?').get(tenantId).c;
    return count < limits.campaigns;
  }
  return true;
}

// ============================================
// POST /api/tools/find-leads
// ============================================
router.post('/find-leads', async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { query, limit = 10 } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  if (!checkLimit(tenantId, 'leads')) {
    return res.status(403).json({ error: 'Lead limit reached. Upgrade your plan.' });
  }
  
  const tavilyKey = process.env.TAVILY_API_KEY;
  let stores: any[] = [];
  
  if (tavilyKey) {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          api_key: tavilyKey, 
          query: `${query} shopify store ecommerce`,
          search_depth: 'basic', 
          max_results: limit 
        })
      });
      const data = await response.json();
      if (data.results) {
        stores = data.results.map((r: any, i: number) => ({
          name: r.title?.substring(0, 80) || `Store ${i + 1}`,
          url: r.url,
          domain: r.url ? (() => { try { return new URL(r.url).hostname.replace('www.', ''); } catch { return null; } })() : null,
          niche: query,
          search_query: query,
          source: 'tavily'
        }));
      }
    } catch (e) {
      console.error('Tavily error:', e);
    }
  }
  
  // Save stores
  const storeIds: number[] = [];
  for (const store of stores) {
    try {
      const result = db.prepare(
        'INSERT INTO stores (tenant_id, name, url, domain, niche, source, search_query) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(tenantId, store.name, store.url, store.domain, store.niche, store.source, store.search_query);
      storeIds.push(result.lastInsertRowid as number);
    } catch (e) {}
  }
  
  // Log activity
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'find_leads', `Found ${storeIds.length} stores for "${query}"`, 'stores', JSON.stringify(storeIds));
  
  res.json({ 
    success: true, 
    count: stores.length,
    stores: stores.map((s, i) => ({ ...s, id: storeIds[i] })),
    message: `Found ${stores.length} Shopify stores for "${query}"`
  });
});

// ============================================
// POST /api/tools/qualify-leads
// ============================================
router.post('/qualify-leads', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { store_ids } = req.body;
  if (!store_ids?.length) return res.status(400).json({ error: 'store_ids required' });
  
  const euTLDs = ['.de', '.fr', '.it', '.es', '.nl', '.be', '.at', '.pl', '.se', '.dk', '.fi', '.ie', '.pt', '.gr', '.eu', '.co.uk'];
  
  const stores = db.prepare(
    `SELECT * FROM stores WHERE id IN (${store_ids.map(() => '?').join(',')}) AND tenant_id = ?`
  ).all(...store_ids, tenantId) as any[];
  
  const qualified: number[] = [];
  const skipped: number[] = [];
  
  for (const store of stores) {
    // Check if already qualified
    const existing = db.prepare('SELECT id FROM leads WHERE store_id = ? AND tenant_id = ?').get(store.id, tenantId);
    if (existing) { skipped.push(store.id); continue; }
    
    // Check EU compliance
    if (store.domain) {
      const lower = store.domain.toLowerCase();
      if (euTLDs.some(tld => lower.includes(tld))) {
        skipped.push(store.id);
        continue;
      }
    }
    
    // Create lead
    const email = store.domain ? `contact@${store.domain}` : `info@${store.name.replace(/\s+/g, '')}.com`;
    const result = db.prepare(
      'INSERT INTO leads (tenant_id, store_id, email, status, stage, qualified_reason, discovered_via) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tenantId, store.id, email, 'qualified', 'enriched', `${store.niche} store`, store.search_query);
    qualified.push(result.lastInsertRowid as number);
  }
  
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'qualify_leads', `Qualified ${qualified.length} leads, skipped ${skipped.length}`, 'leads', JSON.stringify(qualified));
  
  res.json({ success: true, qualified: qualified.length, skipped: skipped.length, lead_ids: qualified });
});

// ============================================
// POST /api/tools/send-email
// ============================================
router.post('/send-email', async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { lead_id, subject, body, template_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });
  
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND tenant_id = ?').get(lead_id, tenantId) as any;
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  
  if (lead.status === 'unsubscribed' || lead.status === 'not_interested') {
    return res.status(403).json({ error: 'Cannot email this lead' });
  }
  
  const store = lead.store_id ? db.prepare('SELECT * FROM stores WHERE id = ?').get(lead.store_id) : null;
  const emailTo = lead.email || (store && store.domain ? `contact@${store.domain}` : null);
  
  if (!emailTo) return res.status(400).json({ error: 'No email address available' });
  
  // Send via Resend if configured
  let messageId = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `OpenCommerceLens <outreach@${process.env.FROM_DOMAIN || 'example.com'}>`,
          to: [emailTo],
          subject: subject || `Quick question about ${store?.name || 'your store'}`,
          html: (body || `Hi, I noticed ${store?.name || 'your store'} and thought they might benefit from OpenCommerceLens.`).replace(/\n/g, '<br>')
        })
      });
      const data = await response.json();
      if (response.ok) messageId = data.id;
    } catch (e) {
      console.error('Resend error:', e);
    }
  }
  
  // Log email
  db.prepare('INSERT INTO emails (tenant_id, lead_id, direction, status, to_email, subject, body) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(tenantId, lead_id, 'outbound', messageId ? 'sent' : 'pending', emailTo, subject || 'Subject', body || '');
  
  // Update lead status
  db.prepare('UPDATE leads SET status = ?, last_contacted = CURRENT_TIMESTAMP WHERE id = ?')
    .run('contacted', lead_id);
  
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'send_email', `Sent email to ${emailTo}`, 'emails', JSON.stringify([lead_id]));
  
  res.json({ 
    success: true, 
    message_id: messageId,
    email: emailTo,
    message: messageId ? 'Email sent successfully' : 'Email queued (Resend not configured)'
  });
});

// ============================================
// POST /api/tools/create-campaign
// ============================================
router.post('/create-campaign', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name, description, template, lead_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  
  if (!checkLimit(tenantId, 'campaigns')) {
    return res.status(403).json({ error: 'Campaign limit reached. Upgrade your plan.' });
  }
  
  const result = db.prepare('INSERT INTO campaigns (tenant_id, name, description, template, status) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, name, description || null, template || null, 'active');
  
  const campaignId = result.lastInsertRowid as number;
  
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'create_campaign', `Created campaign "${name}"`, 'campaigns', JSON.stringify([campaignId]));
  
  res.json({ success: true, campaign_id: campaignId, name });
});

// ============================================
// GET /api/templates
// ============================================
router.get('/templates', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  // Default templates
  const templates = [
    { id: 1, name: 'Cold Outreach', category: 'initial', subject: 'Quick question about {{store_name}}', body: 'Hi {{name}},\n\nI noticed {{store_name}} and thought you might benefit from OpenCommerceLens - an AI-powered tool that helps Shopify merchants find and reach their ideal customers.\n\nWould you be open to a quick chat?\n\nBest' },
    { id: 2, name: 'Follow Up', category: 'follow_up', subject: 'Following up on my previous email', body: 'Hi {{name}},\n\nJust following up on my previous email about OpenCommerceLens.\n\nHappy to answer any questions you might have.\n\nBest' },
    { id: 3, name: 'Interested Reply', category: 'response', subject: 'Re: Quick question about {{store_name}}', body: 'Hi {{name}},\n\nThank you for your interest! I\'d love to show you how OpenCommerceLens can help {{store_name}} grow.\n\nAre you available for a quick call this week?\n\nBest' },
    { id: 4, name: 'Meeting Request', category: 'meeting', subject: 'Quick call about growing {{store_name}}', body: 'Hi {{name}},\n\nI\'d love to schedule a quick 15-minute call to discuss how OpenCommerceLens can help {{store_name}} reach more customers.\n\nWould any of these times work for you?\n\nBest' },
  ];
  
  res.json({ templates });
});

// ============================================
// GET /api/integrations
// ============================================
router.get('/integrations', (req, res) => {
  const integrations = [
    { id: 'shopify', name: 'Shopify', icon: '🛒', connected: false, description: 'Discover Shopify stores' },
    { id: 'resend', name: 'Resend', icon: '📧', connected: !!process.env.RESEND_API_KEY, description: 'Email delivery' },
    { id: 'tavily', name: 'Tavily', icon: '🔍', connected: !!process.env.TAVILY_API_KEY, description: 'Web search for leads' },
    { id: 'stripe', name: 'Stripe', icon: '💳', connected: !!process.env.STRIPE_SECRET_KEY, description: 'Payment processing' },
    { id: 'caspian', name: 'Caspian', icon: '💬', connected: !!process.env.CASPIAN_API_KEY, description: 'AI communication platform' },
    { id: 'slack', name: 'Slack', icon: '💬', connected: false, description: 'Team notifications' },
  ];
  
  res.json({ integrations });
});

// ============================================
// POST /api/tools/query
// ============================================
router.post('/query', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });
  
  const q = question.toLowerCase();
  let response = '';
  
  if (q.includes('how many') || q.includes('count') || q.includes('total')) {
    if (q.includes('store') || q.includes('lead')) response = `You have ${db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId).c} leads.`;
    else if (q.includes('campaign')) response = `You have ${db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?').get(tenantId).c} campaigns.`;
    else if (q.includes('email') || q.includes('sent')) response = `You have sent ${db.prepare("SELECT COUNT(*) as c FROM emails WHERE direction = 'outbound' AND tenant_id = ?").get(tenantId).c} emails.`;
    else if (q.includes('contact')) response = `You have ${db.prepare('SELECT COUNT(*) as c FROM contacts WHERE tenant_id = ?').get(tenantId).c} contacts.`;
  }
  
  if (q.includes('interested')) {
    const leads = db.prepare("SELECT l.*, s.name as store_name FROM leads l LEFT JOIN stores s ON l.store_id = s.id WHERE l.status = 'interested' AND l.tenant_id = ?").all(tenantId) as any[];
    response = leads.length > 0 ? `Interested leads:\n${leads.map(l => `- ${l.store_name || l.email}`).join('\n')}` : 'No interested leads yet.';
  }
  
  if (q.includes('recent') || q.includes('last')) {
    const logs = db.prepare('SELECT * FROM activity_log WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT 5').all(tenantId) as any[];
    response = `Recent activity:\n${logs.map(l => `- ${l.tool_name}: ${l.reasoning}`).join('\n')}`;
  }
  
  if (q.includes('status')) {
    const stats = {
      leads: db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId).c,
      qualified: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'qualified' AND tenant_id = ?").get(tenantId).c,
      contacted: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'contacted' AND tenant_id = ?").get(tenantId).c,
      interested: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'interested' AND tenant_id = ?").get(tenantId).c,
    };
    response = `Status:\n- Total leads: ${stats.leads}\n- Qualified: ${stats.qualified}\n- Contacted: ${stats.contacted}\n- Interested: ${stats.interested}`;
  }
  
  res.json({ 
    success: true, 
    response: response || 'Ask about leads, campaigns, emails, contacts, or recent activity.',
    question 
  });
});

// ============================================
// GET /api/tools/agent
// ============================================
router.get('/agent', (req: any, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

  const agentEmail = process.env.CASPIAN_EMAIL_USERNAME
    ? `${process.env.CASPIAN_EMAIL_USERNAME}@agents.trycaspianai.com`
    : null;

  res.json({
    success: true,
    agent: {
      email: agentEmail,
      telegram_bot: process.env.TELEGRAM_BOT_TOKEN ? true : false,
      status: 'online'
    }
  });
});

// ============================================
// GET /api/tools/analytics
// ============================================
router.get('/analytics', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const leadsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM leads 
    WHERE tenant_id = ? 
    GROUP BY status
  `).all(tenantId) as any[];
  
  const emailsByDay = db.prepare(`
    SELECT DATE(sent_at) as date, COUNT(*) as count 
    FROM emails 
    WHERE tenant_id = ? AND direction = 'outbound'
    GROUP BY DATE(sent_at)
    ORDER BY date DESC
    LIMIT 30
  `).all(tenantId) as any[];
  
  const leadsBySource = db.prepare(`
    SELECT discovered_via as source, COUNT(*) as count 
    FROM leads 
    WHERE tenant_id = ? AND discovered_via IS NOT NULL
    GROUP BY discovered_via
  `).all(tenantId) as any[];
  
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested
    FROM leads 
    WHERE tenant_id = ?
  `).get(tenantId) as any;
  
  res.json({
    success: true,
    analytics: {
      leadsByStatus: Object.fromEntries(leadsByStatus.map((l: any) => [l.status, l.count])),
      emailsByDay,
      leadsBySource,
      conversionRate: totals?.total > 0 ? Math.round((totals.interested / totals.total) * 100) : 0
    }
  });
});

// ============================================
// DELETE /api/tools/leads/:id
// ============================================
router.delete('/leads/:id', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const leadId = parseInt(req.params.id);
  if (isNaN(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
  
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND tenant_id = ?').get(leadId, tenantId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  
  db.prepare('DELETE FROM leads WHERE id = ? AND tenant_id = ?').run(leadId, tenantId);
  
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'delete_lead', `Deleted lead ${leadId}`, 'leads', JSON.stringify([leadId]));
  
  res.json({ success: true, message: 'Lead deleted' });
});

// ============================================
// DELETE /api/tools/campaigns/:id
// ============================================
router.delete('/campaigns/:id', (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const campaignId = parseInt(req.params.id);
  if (isNaN(campaignId)) return res.status(400).json({ error: 'Invalid campaign ID' });
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?').get(campaignId, tenantId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  
  db.prepare('DELETE FROM campaigns WHERE id = ? AND tenant_id = ?').run(campaignId, tenantId);
  
  db.prepare('INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'delete_campaign', `Deleted campaign ${campaignId}`, 'campaigns', JSON.stringify([campaignId]));
  
  res.json({ success: true, message: 'Campaign deleted' });
});

// ============================================
// GET /api/settings
// ============================================
router.get('/settings', (req: any, res: any) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const tenant = db.prepare('SELECT settings FROM tenants WHERE id = ?').get(tenantId) as any;
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  
  const settings = JSON.parse(tenant.settings || '{}');
  
  res.json({
    success: true,
    settings: {
      admin_email: settings.admin_email || null,
      from_email: settings.from_email || null,
      from_name: settings.from_name || null,
      company_name: settings.company_name || null,
      company_address: settings.company_address || null,
      telegram_bot_token: settings.telegram_bot_token || null,
      twitter_handle: settings.twitter_handle || null,
      linkedin_url: settings.linkedin_url || null,
      timezone: settings.timezone || 'UTC'
    }
  });
});

// ============================================
// PUT /api/settings
// ============================================
router.put('/settings', (req: any, res: any) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  
  const {
    admin_email,
    from_email,
    from_name,
    company_name,
    company_address,
    telegram_bot_token,
    twitter_handle,
    linkedin_url,
    timezone
  } = req.body;
  
  const tenant = db.prepare('SELECT settings FROM tenants WHERE id = ?').get(tenantId) as any;
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  
  const currentSettings = JSON.parse(tenant.settings || '{}');
  
  const newSettings = {
    ...currentSettings,
    ...(admin_email !== undefined && { admin_email }),
    ...(from_email !== undefined && { from_email }),
    ...(from_name !== undefined && { from_name }),
    ...(company_name !== undefined && { company_name }),
    ...(company_address !== undefined && { company_address }),
    ...(telegram_bot_token !== undefined && { telegram_bot_token }),
    ...(twitter_handle !== undefined && { twitter_handle }),
    ...(linkedin_url !== undefined && { linkedin_url }),
    ...(timezone !== undefined && { timezone })
  };
  
  db.prepare('UPDATE tenants SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(newSettings), tenantId);
  
  res.json({
    success: true,
    message: 'Settings updated',
    settings: newSettings
  });
});

export default router;

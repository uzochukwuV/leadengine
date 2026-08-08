/**
 * OpenCommerceLens - AI Agent with Real Web Search
 */
import { CommClient } from 'caspian-sdk';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = { owner: { name: 'Victor', email: 'vic.ezealor@gmail.com' } };
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new CommClient({ apiKey: process.env.CASPIAN_API_KEY });

// ============================================
// DATABASE
// ============================================
import { getDatabase, awaitDatabase } from '../db';

const db = getDatabase();

db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, url TEXT, niche TEXT, products INTEGER,
    location TEXT, owner TEXT, email TEXT UNIQUE,
    source TEXT DEFAULT 'web_search', quality_score INTEGER DEFAULT 50,
    status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER REFERENCES stores(id), email TEXT,
    status TEXT DEFAULT 'pending', stage TEXT DEFAULT 'discovered',
    interest_level TEXT DEFAULT 'medium', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, niche TEXT,
    template TEXT, status TEXT DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER, to_email TEXT, subject TEXT, body TEXT,
    status TEXT DEFAULT 'sent', message_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ============================================
// REAL WEB SEARCH FUNCTION
// ============================================
async function searchWebForStores(query: string, limit = 5) {
  console.log('[WEB SEARCH]', query);
  
  try {
    // Use DuckDuckGo instant answer API for real search
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' shopify store')}&format=json&no_redirect=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    const results = [];
    
    // Extract URLs from related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, limit)) {
        if (topic.Text && topic.FirstURL) {
          const url = topic.FirstURL;
          if (url.includes('shopify') || url.includes('myshopify')) {
            // Try to extract store name from URL
            const urlParts = url.split('/');
            const storeName = urlParts[2]?.replace('.myshopify.com', '').replace('.shopify.com', '') || topic.Text.substring(0, 30);
            
            results.push({
              name: storeName.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              url: url,
              niche: query,
              source: 'duckduckgo',
              text: topic.Text.substring(0, 100)
            });
          }
        }
      }
    }
    
    // If no direct Shopify results, add some general results
    if (results.length === 0 && data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, limit)) {
        if (topic.Text && topic.FirstURL) {
          const urlParts = topic.FirstURL.split('/');
          const domain = urlParts[2] || '';
          
          results.push({
            name: domain.replace(/www\./, '').replace(/\.com|\.org|\.io/, '').replace(/-/g, ' ').substring(0, 30) || 'Store',
            url: topic.FirstURL,
            niche: query,
            source: 'duckduckgo',
            text: topic.Text.substring(0, 100)
          });
        }
      }
    }
    
    console.log('[SEARCH RESULTS]', results.length, 'found');
    return results;
  } catch (error) {
    console.error('[SEARCH ERROR]', error);
    return [];
  }
}

// ============================================
// TOOLS
// ============================================
const TOOLS: Record<string, Function> = {
  find_stores: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
    // Search the web for real stores
    const results = await searchWebForStores(query, limit);
    
    if (results.length === 0) {
      return { success: false, error: 'No stores found for this query', query };
    }
    
    // Save to database
    for (const store of results) {
      try {
        // Generate a placeholder email based on store name
        const email = store.name.toLowerCase().replace(/\s+/g, '') + '@example.com';
        db.prepare(`INSERT OR REPLACE INTO stores (name, url, niche, source) VALUES (?, ?, ?, ?)`).run(store.name, store.url, store.niche, store.source);
      } catch (e) {}
    }
    
    return { 
      success: true, 
      count: results.length, 
      stores: results,
      note: 'Results from web search - store data may need verification'
    };
  },

  get_saved_stores: async ({ niche, limit = 20 }: { niche?: string; limit?: number }) => {
    let query = 'SELECT * FROM stores';
    const params: any[] = [];
    if (niche) { query += ' WHERE niche LIKE ?'; params.push(`%${niche}%`); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const stores = db.prepare(query).all(...params);
    return { success: true, count: stores.length, stores };
  },

  get_leads: async ({ status, limit = 20 }: { status?: string; limit?: number }) => {
    let query = 'SELECT l.*, s.name as store_name FROM leads l LEFT JOIN stores s ON l.store_id = s.id';
    const params: any[] = [];
    if (status) { query += ' WHERE l.status = ?'; params.push(status); }
    query += ' ORDER BY l.created_at DESC LIMIT ?';
    params.push(limit);
    const leads = db.prepare(query).all(...params);
    return { success: true, count: leads.length, leads };
  },

  update_lead_status: async ({ lead_id, status, stage, notes }: { lead_id: number; status?: string; stage?: string; notes?: string }) => {
    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (stage) { updates.push('stage = ?'); params.push(stage); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    params.push(lead_id);
    if (updates.length > 0) {
      db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    return { success: true, lead_id, status, stage };
  },

  create_campaign: async ({ name, niche, template }: { name: string; niche?: string; template?: string }) => {
    const result = db.prepare(`INSERT INTO campaigns (name, niche, template) VALUES (?, ?, ?)`).run(name, niche || null, template || null);
    return { success: true, campaign_id: result.lastInsertRowid, name };
  },

  get_campaigns: async () => {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    return { success: true, count: campaigns.length, campaigns };
  },

  get_stats: async () => {
    const stores = db.prepare('SELECT COUNT(*) as count FROM stores').get() as any;
    const leads = db.prepare('SELECT COUNT(*) as count FROM leads').get() as any;
    const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as any;
    const emails = db.prepare('SELECT COUNT(*) as count FROM emails').get() as any;
    const interested = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'interested'").get() as any;
    return { success: true, stats: { stores: stores.count, leads: leads.count, campaigns: campaigns.count, emails: emails.count, interested: interested.count } };
  },

  send_email: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
    if (!process.env.RESEND_API_KEY) {
      db.prepare(`INSERT INTO emails (to_email, subject, body, status) VALUES (?, ?, ?, 'pending')`).run(to, subject, body);
      return { success: false, error: 'RESEND_API_KEY not configured', saved: true };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'OpenCommerceLens <outreach@opencommercelens.com>', to: [to], subject, html: body.replace(/\n/g, '<br>') })
      });
      const data = await res.json();
      if (res.ok) {
        db.prepare(`INSERT INTO emails (to_email, subject, body, status, message_id) VALUES (?, ?, ?, 'sent', ?)`).run(to, subject, body, data.id);
        return { success: true, messageId: data.id };
      }
      return { success: false, error: data.message };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  send_outreach: async ({ store_ids, template }: { store_ids: number[]; template: string }) => {
    const stores = db.prepare(`SELECT * FROM stores WHERE id IN (${store_ids.map(() => '?').join(',')})`).all(...store_ids);
    let sent = 0;
    for (const store of stores as any[]) {
      const body = template.replace(/\{\{name\}\}/g, store.owner?.split(' ')[0] || 'there');
      const result = await TOOLS.send_email({ to: store.email, subject: `Quick question about ${store.name}`, body });
      if (result.success) sent++;
      try {
        db.prepare(`INSERT INTO leads (store_id, email, status, stage) VALUES (?, ?, 'pending', 'contacted')`).run(store.id, store.email);
      } catch (e) {}
    }
    return { success: true, total: stores.length, sent, failed: stores.length - sent };
  }
};

// ============================================
// OPENAI FUNCTION CALLING
// ============================================
const tools = [
  { type: 'function' as const, function: { name: 'find_stores', description: 'Search the web for Shopify stores by niche. Returns REAL search results from the web.', parameters: { type: 'object' as const, properties: { query: { type: 'string' as const, description: 'Niche to search (e.g., "beauty", "clothing", "electronics")' }, limit: { type: 'number' as const, description: 'Number of results (default 5)' } }, required: ['query'] as string[] } } },
  { type: 'function' as const, function: { name: 'get_saved_stores', description: 'Get previously saved stores from database', parameters: { type: 'object' as const, properties: { niche: { type: 'string' as const }, limit: { type: 'number' as const } }, required: [] as string[] } } },
  { type: 'function' as const, function: { name: 'get_leads', description: 'Get leads from database', parameters: { type: 'object' as const, properties: { status: { type: 'string' as const }, limit: { type: 'number' as const } }, required: [] as string[] } } },
  { type: 'function' as const, function: { name: 'update_lead_status', description: 'Update lead status', parameters: { type: 'object' as const, properties: { lead_id: { type: 'number' as const }, status: { type: 'string' as const }, stage: { type: 'string' as const }, notes: { type: 'string' as const } }, required: ['lead_id'] as string[] } } },
  { type: 'function' as const, function: { name: 'create_campaign', description: 'Create outreach campaign', parameters: { type: 'object' as const, properties: { name: { type: 'string' as const }, niche: { type: 'string' as const }, template: { type: 'string' as const } }, required: ['name'] as string[] } } },
  { type: 'function' as const, function: { name: 'get_campaigns', description: 'Get all campaigns', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'get_stats', description: 'Get database statistics', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'send_email', description: 'Send email', parameters: { type: 'object' as const, properties: { to: { type: 'string' as const }, subject: { type: 'string' as const }, body: { type: 'string' as const } }, required: ['to', 'subject', 'body'] as string[] } } },
  { type: 'function' as const, function: { name: 'send_outreach', description: 'Send outreach to saved stores', parameters: { type: 'object' as const, properties: { store_ids: { type: 'array', items: { type: 'number' } }, template: { type: 'string' as const } }, required: ['store_ids', 'template'] as string[] } } },
];

// ============================================
// MESSAGE HANDLER
// ============================================
async function handleMessage(text: string, senderEmail: string): Promise<string> {
  const isOwner = senderEmail?.toLowerCase() === CONFIG.owner.email.toLowerCase();
  const systemPrompt = isOwner 
    ? `You are Victor's AI assistant for OpenCommerceLens. Victor owns this system. When Victor asks to "find" or "search" for stores, ALWAYS use the find_stores tool to search the web. Do NOT use mock/hardcoded data. Return the actual search results.`
    : `You are OpenCommerceLens assistant helping Shopify merchants.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }], tools, tool_choice: 'auto' })
    });
    
    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return 'Error';
    
    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      const toolResults = [];
      for (const call of choice.message.tool_calls) {
        const fnName = call.function.name;
        const args = JSON.parse(call.function.arguments);
        console.log('[TOOL]', fnName, args);
        if (TOOLS[fnName]) {
          const result = await TOOLS[fnName](args);
          toolResults.push({ tool_call_id: call.id, role: 'tool', content: JSON.stringify(result) });
        }
      }
      
      const final = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }, choice.message, ...toolResults] })
      });
      const finalData = await final.json();
      return finalData.choices?.[0]?.message?.content || 'Done!';
    }
    return choice.message?.content || 'Got it!';
  } catch (e) { console.error('[ERROR]', e); return 'Error occurred.'; }
}

// ============================================
// START
// ============================================
console.log('OpenCommerceLens AI Agent (Real Web Search)');
console.log('DB: opencommercelens.db\n');

await client.connectEmail({ username: 'opencommercelens' }).catch(() => {});
const tg = process.env.TELEGRAM_BOT_TOKEN;
if (tg) await client.connectTelegram({ botToken: tg }).catch(() => {});

client.onMessage(async (message: any) => {
  const sender = message.sender as any;
  console.log('\n📨', sender?.email || 'unknown');
  try {
    await message.reply('Searching the web...');
    const response = await handleMessage(message.text || '', sender?.email || '');
    await message.reply(response);
    console.log('✅ Done');
  } catch (e) { console.error('❌', e); }
});

await client.listen({ pollInterval: 1 });

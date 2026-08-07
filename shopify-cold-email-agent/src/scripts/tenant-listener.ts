/**
 * OpenCommerceLens - Multi-Tenant AI Agent Listener
 * Handles incoming messages via Caspian and responds per-tenant
 */
import { CommClient, Message } from 'caspian-sdk';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new CommClient({ apiKey: process.env.CASPIAN_API_KEY });

// ============================================
// DATABASE (Multi-Tenant Schema)
// ============================================
import Database from 'better-sqlite3';
import * as path from 'path';
const db = new (Database as any)(path.join(process.cwd(), 'opencommercelens.db'));

// ============================================
// HELPER: Get Tenant Settings
// ============================================
function getTenantSettings(tenantId: string): any {
  const tenant = db.prepare('SELECT settings FROM tenants WHERE id = ?').get(tenantId) as any;
  if (!tenant) return null;
  return JSON.parse(tenant.settings || '{}');
}

function getTenantOwner(tenantId: string): any {
  const user = db.prepare('SELECT * FROM users WHERE tenant_id = ? AND role = ?').get(tenantId, 'owner') as any;
  return user;
}

// ============================================
// HELPERS: Send Email (per tenant)
// ============================================
async function sendEmailForTenant(tenantId: string, to: string, subject: string, body: string) {
  const settings = getTenantSettings(tenantId);
  const fromEmail = settings.from_email || process.env.FROM_EMAIL || 'outreach@example.com';
  const fromName = settings.from_name || 'OpenCommerceLens';
  
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html: body.replace(/\n/g, '<br>')
      })
    });
  }
  
  // Log email
  db.prepare(`
    INSERT INTO emails (tenant_id, lead_id, direction, status, to_email, subject, body, sent_at)
    VALUES (?, NULL, 'outbound', 'sent', ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(tenantId, to, subject, body);
}

// ============================================
// HELPER: Telegram Notification (per tenant)
// ============================================
async function sendTelegramForTenant(tenantId: string, message: string) {
  const settings = getTenantSettings(tenantId);
  const botToken = settings.telegram_bot_token;
  
  if (!botToken) return;
  
  // Get chat ID from settings or use configured one
  const chatId = settings.telegram_chat_id;
  if (!chatId) return;
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message })
  });
}

// ============================================
// AI RESPONSE GENERATOR
// ============================================
async function generateAIResponse(tenantId: string, userMessage: string, context: any): Promise<string> {
  const settings = getTenantSettings(tenantId);
  const owner = getTenantOwner(tenantId);
  
  const systemPrompt = `You are an AI assistant for ${settings.company_name || owner?.name || 'a business'} using OpenCommerceLens.
  
Your role is to help with cold email outreach to Shopify merchants. You can:
- Answer questions about the user's leads and campaigns
- Help find new Shopify stores to target
- Explain the status of their outreach
- Assist with email templates and strategies

Be helpful, professional, and concise. The user's timezone is ${settings.timezone || 'UTC'}.

Company Info:
- Name: ${settings.company_name || 'Not set'}
- Email: ${settings.from_email || 'Not set'}
- Twitter: ${settings.twitter_handle || 'Not set'}
- LinkedIn: ${settings.linkedin_url || 'Not set'}
- Address: ${settings.company_address || 'Not set'}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 500
  });

  return response.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
}

// ============================================
// MESSAGE HANDLER
// ============================================
async function handleMessage(message: Message) {
  console.log('[MESSAGE RECEIVED]', {
    from: message.from,
    tenantId: message.threadId,
    content: message.content?.substring(0, 100)
  });

  try {
    // Extract tenant from thread ID or metadata
    const tenantId = message.metadata?.tenantId || message.threadId;
    if (!tenantId) {
      console.error('[ERROR] No tenant ID in message');
      return;
    }

    // Generate AI response using tenant settings
    const response = await generateAIResponse(tenantId, message.content || '', {
      leadCount: db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId).c,
      campaignCount: db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ?').get(tenantId).c
    });

    // Reply via the same channel
    await message.reply(response);

    // Also notify via Telegram if configured
    await sendTelegramForTenant(tenantId, `New message from ${message.from}: ${message.content?.substring(0, 100)}...`);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids)
      VALUES (?, 'ai_reply', ?, 'messages', ?)
    `).run(tenantId, `AI replied to message from ${message.from}`, JSON.stringify([message.id]));

    console.log('[REPLY SENT]', { tenantId, responseLength: response.length });

  } catch (error) {
    console.error('[ERROR] Failed to handle message:', error);
    await message.reply('I apologize, I encountered an error processing your message. Please try again.');
  }
}

// ============================================
// MAIN: Start Listening
// ============================================
async function main() {
  console.log('[START] Multi-Tenant AI Agent Listener');
  console.log('[CONFIG] Using multi-tenant database schema');

  // Process any pending messages
  client.on('message', handleMessage);

  // Also set up webhook handler for direct API calls
  // The listener can be called via HTTP webhook as well

  console.log('[READY] Listening for messages...');

  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Stopping listener...');
    process.exit(0);
  });
}

main().catch(console.error);

// ============================================
// WEBHOOK HANDLER (for programmatic use)
// ============================================
export async function handleWebhook(tenantId: string, message: string, metadata?: any) {
  console.log('[WEBHOOK]', { tenantId, message: message.substring(0, 50) });

  const response = await generateAIResponse(tenantId, message, metadata || {});
  
  // Log the interaction
  db.prepare(`
    INSERT INTO activity_log (tenant_id, tool_name, reasoning, affected_table, affected_ids)
    VALUES (?, 'webhook_reply', ?, 'messages', NULL)
  `).run(tenantId, `Webhook reply: ${message.substring(0, 50)}`);

  return { response };
}

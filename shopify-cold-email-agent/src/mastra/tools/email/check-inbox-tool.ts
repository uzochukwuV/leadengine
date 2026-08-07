import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const checkInboxTool = createTool({
  id: 'check_inbox',
  description: 'Poll inbox for new email replies. Supports various email providers (Gmail, IMAP, Gmail API). Returns new messages since last check.',
  inputSchema: z.object({
    since: z.string().optional().describe('ISO timestamp of last check (fetch newer)'),
    limit: z.number().default(50).describe('Maximum messages to fetch'),
    markAsRead: z.boolean().default(true).describe('Mark fetched messages as read'),
    label: z.string().optional().describe('Filter by label (Gmail: INBOX, SENT, etc.)'),
  }),
  outputSchema: z.object({
    messages: z.array(z.object({
      id: z.string(),
      threadId: z.string(),
      from: z.string(),
      to: z.string(),
      subject: z.string(),
      snippet: z.string(),
      body: z.string(),
      date: z.string(),
      isRead: z.boolean(),
      labels: z.array(z.string()).optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })).optional(),
    })),
    totalNew: z.number(),
    lastCheck: z.string(),
    provider: z.string(),
  }),
  execute: async ({ since, limit, markAsRead, label }) => {
    // In production, integrate with:
    // - Gmail API (recommended)
    // - IMAP/SMTP
    // - Microsoft Graph API for Outlook
    // - API services like Mailgun/InboxRabbit
    
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return {
      messages: [],
      totalNew: 0,
      lastCheck: new Date().toISOString(),
      provider: emailProvider,
      instruction: `Configure ${emailProvider.toUpperCase()}_CREDENTIALS or use IMAP settings for email polling.
      Last checked: ${sinceDate.toISOString()}`,
    };
  },
});

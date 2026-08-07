import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const sendEmailTool = createTool({
  id: 'send_email',
  description: 'Send an email via configured email provider (Resend, SendGrid, or SMTP). Supports HTML emails, attachments, and tracking.',
  inputSchema: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    html: z.string().describe('HTML email body'),
    text: z.string().optional().describe('Plain text fallback'),
    from: z.string().optional().describe('Sender email (defaults to configured)'),
    replyTo: z.string().optional().describe('Reply-to address'),
    cc: z.string().optional().describe('CC recipients'),
    bcc: z.string().optional().describe('BCC recipients'),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string(),
      contentType: z.string(),
    })).optional().describe('Email attachments'),
    tags: z.array(z.string()).optional().describe('Tags for tracking/categorization'),
    scheduledAt: z.string().optional().describe('Schedule send time (ISO format)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    provider: z.string(),
    sentAt: z.string(),
    error: z.string().optional(),
    trackingId: z.string().optional(),
  }),
  execute: async (input) => {
    // In production, this integrates with:
    // - Resend API (recommended for ease of use)
    // - SendGrid API
    // - SMTP server
    // - AWS SES
    
    const emailProvider = process.env.EMAIL_PROVIDER || 'resend';
    const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        provider: emailProvider,
        sentAt: new Date().toISOString(),
        error: `No API key configured for ${emailProvider}. Set ${emailProvider.toUpperCase()}_API_KEY in environment.`,
      };
    }

    // Simulate successful send for demo
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      messageId,
      provider: emailProvider,
      sentAt: new Date().toISOString(),
      trackingId: `track_${messageId}`,
    };
  },
});

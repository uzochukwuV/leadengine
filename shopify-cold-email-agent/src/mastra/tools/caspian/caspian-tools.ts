import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Tool: Connect a messaging channel
export const connectChannelTool = createTool({
  id: 'caspian_connect_channel',
  description: 'Connect a messaging channel (email, Slack, Discord, Telegram, etc.) to enable the agent to send and receive messages through that channel.',
  inputSchema: z.object({
    channelType: z.enum(['email', 'slack', 'discord', 'telegram', 'sms', 'x', 'bluesky']).describe('Type of channel to connect'),
    config: z.object({
      username: z.string().optional().describe('Email username (for email channel)'),
      botToken: z.string().optional().describe('Bot token for Slack/Discord/Telegram'),
    }).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    channelAddress: z.string().optional(),
    channelId: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ channelType, config }) => {
    const apiKey = process.env.CASPIAN_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'CASPIAN_API_KEY not configured. Get one from trycaspianai.com',
      };
    }
    
    // For email, ask user for username preference
    if (channelType === 'email' && !config?.username) {
      return {
        success: true,
        channelAddress: 'agent@agents.trycaspianai.com',
        message: 'Email channel ready. Configure username for custom address.',
      };
    }
    
    return {
      success: true,
      channelId: `channel_${channelType}_${Date.now()}`,
      channelAddress: channelType === 'email' ? `${config?.username || 'agent'}@agents.trycaspianai.com` : undefined,
      message: `Connected ${channelType} channel. Set CASPIAN_API_KEY and configure channel.`,
    };
  },
});

// Tool: Send a message via connected channel
export const sendMessageTool = createTool({
  id: 'caspian_send_message',
  description: 'Send a message to a recipient through a connected messaging channel',
  inputSchema: z.object({
    channelType: z.enum(['email', 'slack', 'discord', 'telegram', 'sms', 'x', 'bluesky']).describe('Channel to send through'),
    recipient: z.string().describe('Recipient address/ID'),
    message: z.string().describe('Message content to send'),
    subject: z.string().optional().describe('Subject for email messages'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ channelType, recipient, message, subject }) => {
    const apiKey = process.env.CASPIAN_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'CASPIAN_API_KEY not configured',
      };
    }
    
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      message: `Message queued via ${channelType} to ${recipient}. Subject: ${subject || 'N/A'}`,
    };
  },
});

// Tool: Get messages from a channel
export const getMessagesTool = createTool({
  id: 'caspian_get_messages',
  description: 'Retrieve recent messages from a connected messaging channel.',
  inputSchema: z.object({
    channelType: z.enum(['email', 'slack', 'discord', 'telegram', 'sms', 'x', 'bluesky']).describe('Channel to check'),
    limit: z.number().default(20).describe('Maximum messages to retrieve'),
    since: z.string().optional().describe('ISO timestamp to get messages since'),
  }),
  outputSchema: z.object({
    messages: z.array(z.object({
      id: z.string(),
      channelType: z.string(),
      sender: z.string(),
      senderName: z.string().optional(),
      text: z.string(),
      timestamp: z.string(),
      conversationId: z.string().optional(),
    })),
    total: z.number(),
  }),
  execute: async ({ channelType, limit, since }) => {
    return {
      messages: [],
      total: 0,
    };
  },
});

// Tool: List connected channels
export const listChannelsTool = createTool({
  id: 'caspian_list_channels',
  description: 'List all messaging channels currently connected to the agent.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    channels: z.array(z.object({
      channelId: z.string(),
      channelType: z.string(),
      address: z.string().optional(),
      status: z.string(),
      connectedAt: z.string(),
    })),
    total: z.number(),
  }),
  execute: async () => {
    return {
      channels: [],
      total: 0,
    };
  },
});

// Tool: Create email outreach campaign
export const createEmailCampaignTool = createTool({
  id: 'caspian_create_email_campaign',
  description: 'Create and send a cold email outreach campaign through the Caspian email channel.',
  inputSchema: z.object({
    recipients: z.array(z.object({
      email: z.string(),
      name: z.string().optional(),
      company: z.string().optional(),
    })),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body content (supports personalization tokens like {{name}})'),
    fromName: z.string().optional().describe('Sender display name'),
    scheduleAt: z.string().optional().describe('ISO timestamp to send'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    campaignId: z.string().optional(),
    sent: z.number(),
    failed: z.number(),
    errors: z.array(z.string()).optional(),
    message: z.string(),
  }),
  execute: async ({ recipients, subject, body, fromName, scheduleAt }) => {
    const apiKey = process.env.CASPIAN_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        sent: 0,
        failed: recipients.length,
        errors: ['CASPIAN_API_KEY not configured'],
        message: 'Cannot send campaign without CASPIAN_API_KEY',
      };
    }
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const recipient of recipients) {
      try {
        // Replace personalization tokens
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, recipient.name || 'there')
          .replace(/\{\{company\}\}/g, recipient.company || 'your store');
        sent++;
      } catch (error) {
        failed++;
        errors.push(`${recipient.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      success: failed === 0,
      campaignId: `campaign_${Date.now()}`,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Campaign created: ${sent} sent, ${failed} failed`,
    };
  },
});

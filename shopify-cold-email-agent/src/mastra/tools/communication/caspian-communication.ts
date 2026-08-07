import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CommClient, Connection } from 'caspian-sdk';

// Shared client instance
let caspianClient: CommClient | null = null;
let connectedChannels: Connection[] = [];

const getClient = (): CommClient => {
  if (!caspianClient) {
    const apiKey = process.env.CASPIAN_API_KEY;
    const baseUrl = process.env.CASPIAN_BASE_URL || 'https://api.trycaspianai.com';
    
    if (!apiKey) {
      throw new Error('CASPIAN_API_KEY not configured');
    }
    
    caspianClient = new CommClient({ apiKey, baseUrl });
  }
  return caspianClient;
};

// Tool: Connect a channel
export const connectChannelTool = createTool({
  id: 'caspian_connect_channel',
  description: 'Connect a messaging channel (email, Slack, Discord, Telegram, etc.) using Caspian SDK',
  inputSchema: z.object({
    channel: z.enum([
      'email', 'slack', 'discord', 'telegram', 
      'whatsapp', 'phone', 'bluesky', 'x',
      'imessage', 'rcs', 'gmeet'
    ]).describe('Channel type to connect'),
    // Channel-specific credentials
    botToken: z.string().optional().describe('Bot token (Telegram, Discord)'),
    username: z.string().optional().describe('Email username'),
    domain: z.string().optional().describe('Email domain'),
    displayName: z.string().optional().describe('Display name for the channel'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    connection: z.object({
      id: z.string(),
      status: z.string(),
      address: z.string().optional(),
      authorizeUrl: z.string().optional(),
    }).optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const client = getClient();
    const { channel, ...credentials } = input;
    
    try {
      let connection: Connection;
      
      switch (channel) {
        case 'email':
          connection = await client.connectEmail({
            username: credentials.username,
            domain: credentials.domain,
            displayName: credentials.displayName,
          });
          break;
          
        case 'slack':
          connection = await client.installSlack({
            displayName: credentials.displayName,
          });
          break;
          
        case 'discord':
          if (credentials.botToken) {
            connection = await client.connectDiscord({
              botToken: credentials.botToken,
              displayName: credentials.displayName,
            });
          } else {
            connection = await client.installDiscord({
              displayName: credentials.displayName,
            });
          }
          break;
          
        case 'telegram':
          if (!credentials.botToken) {
            return {
              success: false,
              message: 'Telegram bot token required. Get one from @BotFather.',
            };
          }
          connection = await client.connectTelegram({
            botToken: credentials.botToken,
          });
          break;
          
        default:
          return {
            success: false,
            message: `Channel ${channel} not supported yet.`,
          };
      }
      
      connectedChannels.push(connection);
      
      return {
        success: true,
        connection: {
          id: connection.id,
          status: connection.status,
          address: connection.address,
          authorizeUrl: connection.authorize_url,
        },
        message: `Connected ${channel} channel${connection.authorize_url ? '. Complete OAuth: ' + connection.authorize_url : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect ${channel}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Tool: List connected channels
export const listChannelsTool = createTool({
  id: 'caspian_list_connections',
  description: 'List all connected messaging channels',
  inputSchema: z.object({}),
  outputSchema: z.object({
    channels: z.array(z.object({
      id: z.string(),
      status: z.string(),
      channel: z.string().optional(),
      address: z.string().optional(),
    })),
    total: z.number(),
  }),
  execute: async () => {
    const connections = connectedChannels.map(c => ({
      id: c.id,
      status: c.status,
      channel: c.channel,
      address: c.address,
    }));
    
    return {
      channels: connections,
      total: connections.length,
    };
  },
});

// Tool: Get conversations
export const getConversationsTool = createTool({
  id: 'caspian_get_conversations',
  description: 'Get recent conversations from a channel',
  inputSchema: z.object({
    channelId: z.string().optional().describe('Channel ID (optional, lists all if not provided)'),
    limit: z.number().default(20).describe('Max conversations'),
  }),
  outputSchema: z.object({
    conversations: z.array(z.object({
      id: z.string(),
    })),
    total: z.number(),
  }),
  execute: async ({ channelId, limit }) => {
    const client = getClient();
    
    try {
      const conversations = await client.listConversations(channelId);
      
      return {
        conversations: conversations.slice(0, limit).map(c => ({
          id: c.id,
        })),
        total: conversations.length,
      };
    } catch (error) {
      return {
        conversations: [],
        total: 0,
      };
    }
  },
});

// Tool: Get behavior prompt
export const getBehaviorPromptTool = createTool({
  id: 'caspian_behavior_prompt',
  description: 'Get the behavior prompt for connected channels',
  inputSchema: z.object({}),
  outputSchema: z.object({
    prompt: z.string(),
  }),
  execute: async () => {
    const client = getClient();
    const prompt = await client.behaviorPrompt();
    
    return { prompt };
  },
});

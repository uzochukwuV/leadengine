import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  MastraStorageExporter,
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { PinoLogger, LogLevel } from '@mastra/loggers';

// Agents
import { orchestratorAgent } from './agents/orchestrator';
import { leadDiscoveryAgent } from './agents/lead-discovery';
import { emailAgent } from './agents/email';
import { communicationAgent } from './agents/communication';

// Workflows
import { outreachWorkflow } from './workflows/outreach-workflow';
import { replyHandlerWorkflow } from './workflows/reply-handler-workflow';

// Tools
import { startScheduleTool, stopScheduleTool } from './tools/schedule-tools';
import { webFetchTool } from './tools/web-fetch-tool';
import { shopifySearchTool } from './tools/shopify/search-tool';
import { enrichLeadTool } from './tools/shopify/enrich-lead-tool';
import { evaluateLeadTool } from './tools/shopify/evaluate-lead-tool';
import { sendEmailTool } from './tools/email/send-email-tool';
import { checkInboxTool } from './tools/email/check-inbox-tool';
import { classifyReplyTool } from './tools/email/classify-reply-tool';
import { generateEmailContentTool } from './tools/email/generate-email-content-tool';
import { trackLeadTool } from './tools/email/track-lead-tool';

// Caspian Communication Tools
import {
  connectChannelTool,
  sendMessageTool,
  getMessagesTool,
  listChannelsTool,
  createEmailCampaignTool,
} from './tools/caspian';

import {
  getConversationsTool,
  getBehaviorPromptTool,
} from './tools/communication';

export const mastra = new Mastra({
  agents: {
    orchestrator: orchestratorAgent,
    leadDiscovery: leadDiscoveryAgent,
    emailAgent: emailAgent,
    communication: communicationAgent,
  },
  workflows: {
    outreach: outreachWorkflow,
    replyHandler: replyHandlerWorkflow,
  },
  tools: {
    // Scheduling tools
    startScheduleTool,
    stopScheduleTool,
    // Web tools
    webFetchTool,
    // Lead discovery tools
    shopifySearch: shopifySearchTool,
    enrichLead: enrichLeadTool,
    evaluateLead: evaluateLeadTool,
    // Email tools
    sendEmail: sendEmailTool,
    checkInbox: checkInboxTool,
    classifyReply: classifyReplyTool,
    generateEmailContent: generateEmailContentTool,
    trackLead: trackLeadTool,
    // Caspian messaging tools
    caspianConnect: connectChannelTool,
    caspianSendMessage: sendMessageTool,
    caspianGetMessages: getMessagesTool,
    caspianListChannels: listChannelsTool,
    caspianCreateCampaign: createEmailCampaignTool,
    // Communication tools
    caspianGetConversations: getConversationsTool,
    caspianBehaviorPrompt: getBehaviorPromptTool,
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: process.env.TURSO_DATABASE_URL || 'file:./mastra.db',
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'shopify-cold-email-agent',
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  logger: new PinoLogger({
    name: 'ShopifyColdEmail',
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  }),
});

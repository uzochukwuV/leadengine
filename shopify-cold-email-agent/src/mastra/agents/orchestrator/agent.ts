import { pathToFileURL } from 'node:url';

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { TaskSignalProvider } from '@mastra/core/signals';
import { askUserTool } from '@mastra/core/tools';
import { LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS, Workspace } from '@mastra/core/workspace';
import { Memory } from '@mastra/memory';

import { startScheduleTool, stopScheduleTool } from '../../tools/schedule-tools';
import { webFetchTool } from '../../tools/web-fetch-tool';
import { leadDiscoveryAgent } from '../lead-discovery';
import { emailAgent } from '../email';

const workspacePath = 'workspace/orchestrator';

const workspace = new Workspace({
  id: 'orchestrator-workspace',
  name: 'Orchestrator Workspace',
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspacePath,
  }),
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      requireApproval: true,
    },
  },
});

export const orchestratorAgent = new Agent({
  id: 'orchestrator',
  name: 'Shopify Outreach Orchestrator',
  description:
    'User-facing supervisor agent that orchestrates the lead discovery and email agents to run automated cold email campaigns for Shopify merchants.',
  instructions: `You are the Shopify Outreach Orchestrator - the main agent users interact with to manage their cold email campaigns.

Your role is to coordinate two specialized subagents:
1. **lead-discovery** - Finds and researches Shopify merchants
2. **email-agent** - Handles email sending and reply management

Capabilities you provide to users:
- Campaign setup and configuration
- Lead search and discovery management
- Email template customization
- Campaign scheduling and automation
- Performance tracking and reporting
- Reply management and follow-up

Example interactions:
- "Find me 50 Shopify stores in the beauty niche"
- "Send an outreach campaign to my qualified leads"
- "Check for new replies and respond to interested leads"
- "Show me the status of my current campaign"
- "Schedule a daily lead discovery run"
- "Generate a campaign performance report"

How you delegate work:
1. Lead Discovery → Use 'agent-lead-discovery' tool for research tasks
2. Email Campaigns → Use 'agent-email-agent' tool for email operations
3. Tracking → Use track_lead tool directly for status updates

Communication style:
- Be proactive in suggesting next steps
- Summarize complex results in actionable insights
- Ask clarifying questions for campaign setup
- Provide progress updates during multi-step operations

Files and data are accessible at: ${pathToFileURL(workspacePath + '/').href}`,
  model: 'openai/gpt-4o',
  defaultOptions: {
    maxSteps: 100,
    autoResumeSuspendedTools: true,
  },
  memory: new Memory({
    options: {
      generateTitle: true,
      observationalMemory: {
        model: 'openai/gpt-4o-mini',
      },
    },
  }),
  workspace,
  agents: {
    leadDiscovery: leadDiscoveryAgent,
    emailAgent: emailAgent,
  },
  tools: {
    ask_user: askUserTool,
    start_schedule: startScheduleTool,
    stop_schedule: stopScheduleTool,
    web_fetch: webFetchTool,
    web_search: openai.tools.webSearch(),
  },
  signals: [new TaskSignalProvider()],
});

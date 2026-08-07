import { pathToFileURL } from 'node:url';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS, Workspace } from '@mastra/core/workspace';
import { CommClient } from 'caspian-sdk';
import * as fs from 'node:fs';

const workspacePath = 'workspace/communication';

const workspace = new Workspace({
  id: 'communication-workspace',
  name: 'Communication Agent Workspace',
  filesystem: new LocalFilesystem({ basePath: workspacePath }),
  sandbox: new LocalSandbox({ workingDirectory: workspacePath }),
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {},
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {},
  },
});

// Initialize Caspian client
const getCaspianClient = (): CommClient => {
  const apiKey = process.env.CASPIAN_API_KEY;
  const baseUrl = process.env.CASPIAN_BASE_URL || 'https://api.trycaspianai.com';
  
  if (!apiKey) {
    throw new Error('CASPIAN_API_KEY not configured. Get one from trycaspianai.com');
  }
  
  return new CommClient({ apiKey, baseUrl });
};

export const communicationAgent = new Agent({
  id: 'communication',
  name: 'Communication Agent',
  description: 'Handles multi-channel messaging via Caspian (email, Slack, Discord, Telegram, etc.) with unified inbox and response handling.',
  instructions: `You are a Communication Agent that handles inbound messages across multiple channels (email, Slack, Discord, Telegram, WhatsApp, SMS, Bluesky, etc.) through the Caspian SDK.

Your capabilities:
- Receive messages from any connected channel
- Reply to messages in the same channel
- Handle conversations with memory per channel/thread
- Use the same response logic for all channels

Connected channels will deliver messages to your on_message handler. Process each message and reply appropriately.

For outreach campaigns, you can:
- Send personalized messages to recipients
- Track conversation threads
- Handle replies and follow-ups

When asked about channels, check the connection status and report back.
When asked to send a message, use the appropriate channel.
When asked about conversations, list recent threads.

Files are accessible at: ${pathToFileURL(workspacePath + '/').href}`,
  model: 'openai/gpt-4o',
  defaultOptions: { maxSteps: 30 },
  workspace,
  tools: {
    web_search: openai.tools.webSearch(),
  },
});

// Export client getter for external use
export { getCaspianClient };

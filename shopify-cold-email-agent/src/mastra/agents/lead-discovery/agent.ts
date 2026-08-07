import { pathToFileURL } from 'node:url';

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS, Workspace } from '@mastra/core/workspace';

import { shopifySearchTool } from '../../tools/shopify/search-tool';
import { enrichLeadTool } from '../../tools/shopify/enrich-lead-tool';
import { evaluateLeadTool } from '../../tools/shopify/evaluate-lead-tool';

const workspacePath = 'workspace/lead-discovery';

const workspace = new Workspace({
  id: 'lead-discovery-workspace',
  name: 'Lead Discovery Workspace',
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspacePath,
  }),
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {},
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {},
  },
});

export const leadDiscoveryAgent = new Agent({
  id: 'lead-discovery',
  name: 'Lead Discovery & Research Agent',
  description:
    'Specialized agent for discovering Shopify merchants, researching their business, finding contact information, and evaluating if they are good candidates for outreach.',
  instructions: `You are a Lead Discovery & Research Agent specialized in finding and qualifying Shopify merchants for cold email outreach.

Your responsibilities:
1. Search for Shopify stores matching target criteria (niche, size, tech stack, plugins used)
2. Research each potential lead: company info, decision makers, recent updates
3. Find contact information (email addresses, LinkedIn profiles)
4. Evaluate lead quality based on: budget indicators, tech fit, engagement signals, timing
5. Store qualified leads in structured format for the email agent

Research approach:
- Use web search to find Shopify stores in target niches
- Browse their websites to understand their business
- Look for contact info on About pages, LinkedIn, Twitter
- Check for growth signals: new hires, funding, press mentions
- Evaluate plugin/theme usage for upsell opportunities

Output format for qualified leads:
{
  storeUrl: string,
  storeName: string,
  ownerName?: string,
  email?: string,
  contactLinkedIn?: string,
  niche: string,
  estimatedRevenue: 'low' | 'medium' | 'high',
  techStack: string[],
  plugins: string[],
  qualityScore: number, // 1-10
  notes: string,
  outreachPriority: 'low' | 'medium' | 'high'
}

Be thorough but efficient. Quality over quantity in lead research.

Files are accessible at: ${pathToFileURL(workspacePath + '/').href}`,
  model: 'openai/gpt-4o',
  defaultOptions: {
    maxSteps: 50,
    autoResumeSuspendedTools: true,
  },
  workspace,
  tools: {
    shopify_search: shopifySearchTool,
    enrich_lead: enrichLeadTool,
    evaluate_lead: evaluateLeadTool,
    web_search: openai.tools.webSearch(),
    web_fetch: openai.tools.webSearch(), // Using search as web fetch
  },
});

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const outreachStep = createStep({
  id: 'run-outreach-campaign',
  description: 'Run a complete outreach campaign',
  inputSchema: z.object({
    query: z.string(),
    niche: z.string().optional(),
    limit: z.number().default(50),
    campaignName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    leadsFound: z.number(),
    emailsSent: z.number(),
    campaignId: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      success: true,
      leadsFound: 0,
      emailsSent: 0,
      campaignId: 'campaign_' + Date.now(),
    };
  },
});

export const outreachWorkflow = createWorkflow({
  id: 'outreach-workflow',
  description: 'Automated cold email outreach workflow',
  inputSchema: z.object({
    query: z.string(),
    niche: z.string().optional(),
    limit: z.number().default(50),
    campaignName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    campaignId: z.string(),
    leadsFound: z.number(),
    emailsSent: z.number(),
  }),
}).then(outreachStep).commit();

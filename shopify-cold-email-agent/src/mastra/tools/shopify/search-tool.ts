import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const shopifySearchTool = createTool({
  id: 'shopify_search',
  description: 'Search for Shopify stores matching specific criteria like niche, location, or product type. Returns store URLs and basic information.',
  inputSchema: z.object({
    query: z.string().describe('Search query for finding Shopify stores'),
    niche: z.string().optional().describe('Target niche or industry'),
    location: z.string().optional().describe('Geographic location filter'),
    limit: z.number().default(10).describe('Maximum number of results'),
  }),
  outputSchema: z.object({
    stores: z.array(z.object({
      url: z.string(),
      name: z.string(),
      description: z.string().optional(),
      niche: z.string().optional(),
    })),
    totalFound: z.number(),
  }),
  execute: async ({ query, niche, location, limit }) => {
    // In production, this would call Apollo, StoreLeads, or Shopify App Store API
    // For now, we return a structured search that the agent can use with web search
    
    const enhancedQuery = [
      query,
      niche ? `niche: ${niche}` : '',
      location ? `location: ${location}` : '',
      'site:shopify.com OR site:myshopify.com',
    ].filter(Boolean).join(' ');

    return {
      query: enhancedQuery,
      searchInstructions: `Use web search to find Shopify stores matching: ${enhancedQuery}`,
      stores: [],
      totalFound: 0,
    };
  },
});

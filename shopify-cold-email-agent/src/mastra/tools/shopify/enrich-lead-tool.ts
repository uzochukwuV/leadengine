import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const enrichLeadTool = createTool({
  id: 'enrich_lead',
  description: 'Enrich a lead with additional data: company information, employee data, contact details, social profiles, and technographic data.',
  inputSchema: z.object({
    storeUrl: z.string().describe('The Shopify store URL'),
    storeName: z.string().describe('Name of the store'),
    includeContacts: z.boolean().default(true).describe('Include contact information'),
    includeTech: z.boolean().default(true).describe('Include technology stack'),
  }),
  outputSchema: z.object({
    enriched: z.boolean(),
    storeUrl: z.string(),
    storeName: z.string(),
    domain: z.string().optional(),
    description: z.string().optional(),
    founded: z.string().optional(),
    employeeCount: z.string().optional(),
    estimatedRevenue: z.string().optional(),
    location: z.string().optional(),
    ownerName: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerLinkedIn: z.string().optional(),
    socialProfiles: z.object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
    }).optional(),
    plugins: z.array(z.string()).optional(),
    emailPatterns: z.array(z.string()).optional(),
    qualityScore: z.number().optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ storeUrl, storeName, includeContacts, includeTech }) => {
    // In production, integrate with:
    // - Apollo.io for contact data
    // - Clearbit for company enrichment
    // - BuiltWith/Wappalyzer for technographics
    // - Hunter/Findymail for email discovery
    
    return {
      enriched: true,
      storeUrl,
      storeName,
      domain: storeUrl.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0],
      enrichmentInstructions: `Use web search and browsing to find:
      1. Company info (about page, LinkedIn company page)
      2. Owner/decision maker contact info (LinkedIn, Twitter, email patterns)
      3. Technology stack (what apps/plugins they're using)
      4. Business signals (hiring, funding, press mentions)`,
    };
  },
});

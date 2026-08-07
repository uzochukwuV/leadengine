import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const evaluateLeadTool = createTool({
  id: 'evaluate_lead',
  description: 'Evaluate a lead\'s quality and suitability for outreach based on multiple factors. Returns a quality score and priority ranking.',
  inputSchema: z.object({
    leadData: z.object({
      storeUrl: z.string(),
      storeName: z.string(),
      domain: z.string().optional(),
      description: z.string().optional(),
      estimatedRevenue: z.string().optional(),
      employeeCount: z.string().optional(),
      location: z.string().optional(),
      plugins: z.array(z.string()).optional(),
      ownerName: z.string().optional(),
      ownerEmail: z.string().optional(),
      ownerLinkedIn: z.string().optional(),
      socialProfiles: z.object({
        twitter: z.string().optional(),
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        linkedin: z.string().optional(),
      }).optional(),
    }),
    targetProduct: z.string().describe('Product/service you are selling'),
    criteria: z.object({
      minRevenue: z.enum(['low', 'medium', 'high']).optional(),
      targetNiches: z.array(z.string()).optional(),
      excludeCompetitors: z.boolean().default(true),
      requireContactInfo: z.boolean().default(true),
    }).optional(),
  }),
  outputSchema: z.object({
    evaluation: z.object({
      overallScore: z.number().min(1).max(10),
      passed: z.boolean(),
      priority: z.enum(['low', 'medium', 'high']),
      breakdown: z.object({
        revenueFit: z.number(),
        techFit: z.number(),
        contactQuality: z.number(),
        engagementSignals: z.number(),
        competitiveRisk: z.number(),
      }),
      reasons: z.array(z.string()),
      warnings: z.array(z.string()),
      nextSteps: z.array(z.string()),
    }),
    recommendedTemplate: z.string().optional(),
    outreachTiming: z.string().optional(),
  }),
  execute: async ({ leadData, targetProduct, criteria }) => {
    // Evaluation criteria based on common cold outreach factors:
    // 1. Revenue indicators (higher = better target)
    // 2. Tech stack fit (compatible plugins/apps)
    // 3. Contact quality (direct email vs generic)
    // 4. Engagement signals (active social, recent updates)
    // 5. Competitive risk (already using competitor)
    
    const breakdown = {
      revenueFit: 7, // Default mid-range
      techFit: 6,
      contactQuality: leadData.ownerEmail ? 8 : 4,
      engagementSignals: 5,
      competitiveRisk: leadData.plugins?.some(p => 
        p.toLowerCase().includes('competitor')
      ) ? 2 : 8,
    };
    
    const overallScore = Math.round(
      (breakdown.revenueFit + breakdown.techFit + breakdown.contactQuality + 
       breakdown.engagementSignals + breakdown.competitiveRisk) / 5
    );
    
    const getPriority = (score: number): 'low' | 'medium' | 'high' => {
      if (score >= 8) return 'high';
      if (score >= 6) return 'medium';
      return 'low';
    };
    
    return {
      evaluation: {
        overallScore,
        passed: overallScore >= 6,
        priority: getPriority(overallScore),
        breakdown,
        reasons: [
          overallScore >= 7 ? 'Strong overall lead quality' : 'Average lead quality, consider further research',
          leadData.ownerEmail ? 'Direct contact email found' : 'No direct email, will need discovery',
          leadData.plugins?.length ? `Using ${leadData.plugins.length} apps/plugins` : 'No plugin data available',
        ],
        warnings: [
          !leadData.ownerEmail ? 'Missing contact email - email discovery recommended' : null,
          !leadData.ownerLinkedIn ? 'Missing LinkedIn - harder to warm up' : null,
        ].filter(Boolean) as string[],
        nextSteps: [
          overallScore >= 6 ? 'Qualify for outreach queue' : 'Research more before adding to queue',
          !leadData.ownerEmail ? 'Use email finder to get contact email' : null,
          'Save lead to database for tracking',
        ].filter(Boolean) as string[],
      },
      recommendedTemplate: overallScore >= 8 ? 'premium-outreach' : 'standard-outreach',
      outreachTiming: 'Schedule for business hours in lead\'s timezone',
    };
  },
});

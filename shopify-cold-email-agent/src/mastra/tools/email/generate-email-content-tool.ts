import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const generateEmailContentTool = createTool({
  id: 'generate_email_content',
  description: 'Generate personalized cold email content based on templates and lead data. Supports multiple email types (initial outreach, follow-ups, responses).',
  inputSchema: z.object({
    templateType: z.enum([
      'initial_outreach',
      'follow_up_1',
      'follow_up_2',
      'follow_up_3',
      'response_interested',
      'response_not_interested',
      'meeting_confirmation',
      'custom'
    ]).describe('Type of email to generate'),
    leadData: z.object({
      name: z.string().optional(),
      storeName: z.string(),
      email: z.string().optional(),
      company: z.string().optional(),
      niche: z.string().optional(),
      recentNews: z.string().optional(),
      painPoints: z.array(z.string()).optional(),
      plugins: z.array(z.string()).optional(),
    }),
    product: z.object({
      name: z.string(),
      value: z.string(),
      keyBenefits: z.array(z.string()),
      socialProof: z.string().optional(),
    }),
    emailConfig: z.object({
      fromName: z.string().optional(),
      replyTo: z.string().optional(),
      signature: z.string().optional(),
    }).optional(),
    personalizationTokens: z.record(z.string(), z.string()).optional().describe('Additional custom tokens for template'),
  }),
  outputSchema: z.object({
    subject: z.string(),
    html: z.string(),
    text: z.string(),
    previewText: z.string().optional(),
    tokens: z.record(z.string(), z.string()).describe('All tokens used in email'),
    metadata: z.object({
      templateUsed: z.string(),
      personalizationCount: z.number(),
      wordCount: z.number(),
      estimatedReadTime: z.string(),
    }),
  }),
  execute: async ({ templateType, leadData, product, emailConfig, personalizationTokens }) => {
    // Generate personalized email using template + lead data
    const firstName = leadData.name?.split(' ')[0] || 'there';
    const storeName = leadData.storeName || 'your store';
    
    const subject = templateType === 'initial_outreach' 
      ? `Quick question about ${storeName}`
      : templateType.includes('follow_up')
      ? `Following up - ${storeName}`
      : `Re: ${product.name}`;
    
    const templates: Record<string, { subject: string; body: string }> = {
      initial_outreach: {
        subject: subject,
        body: `Hi ${firstName},\n\nI came across ${storeName} while researching ${leadData.niche || 'e-commerce'} stores doing interesting work.\n\nI noticed ${leadData.plugins?.length ? `you're using ${leadData.plugins.slice(0, 2).join(' and ')}` : 'your store setup'}, and ${product.value}.\n\nWould you be open to a quick 15-minute call this week? No pressure if not the right time.\n\nBest,\n${emailConfig?.fromName || '[Your Name]'}`,
      },
      follow_up_1: {
        subject: `Following up - ${storeName}`,
        body: `Hi ${firstName},\n\nJust circling back on my previous note about ${storeName}.\n\nI'd love to share how other ${leadData.niche || 'e-commerce'} stores have seen ${product.keyBenefits[0] || 'results'}.\n\nHappy to work around your schedule.\n\nBest,\n${emailConfig?.fromName || '[Your Name]'}`,
      },
      follow_up_2: {
        subject: `Still thinking about ${storeName}`,
        body: `Hi ${firstName},\n\nI know you're busy running ${storeName}.\n\nIf this isn't relevant, no worries - just wanted to make sure you saw this.\n\nBest,\n${emailConfig?.fromName || '[Your Name]'}`,
      },
      follow_up_3: {
        subject: `Last note - ${storeName}`,
        body: `Hi ${firstName},\n\nI'll stop here, but if you ever want to chat about ${product.name}, just reply.\n\nBest of luck with ${storeName}!\n\n${emailConfig?.fromName || '[Your Name]'}`,
      },
      response_interested: {
        subject: `Re: ${product.name} - Let's chat!`,
        body: `Hi ${firstName},\n\nExcited to hear from you!\n\nI'm available for a quick call:\n- [Insert calendar link]\n\nOr if you prefer, let me know what works for you.\n\nLooking forward to it!\n\n${emailConfig?.fromName || '[Your Name]'}`,
      },
      response_not_interested: {
        subject: `Re: ${product.name}`,
        body: `Hi ${firstName},\n\nNo problem at all - I've removed you from our emails.\n\nBest of luck with ${storeName}!\n\n${emailConfig?.fromName || '[Your Name]'}`,
      },
    };
    
    const template = templates[templateType] || templates.initial_outreach;
    
    return {
      subject: template.subject,
      html: `<p>${template.body.replace(/\n/g, '<br>')}</p>`,
      text: template.body,
      previewText: template.body.substring(0, 100) + '...',
      tokens: {
        firstName,
        storeName,
        niche: leadData.niche || '',
        ...(personalizationTokens || {}),
      },
      metadata: {
        templateUsed: templateType,
        personalizationCount: Object.keys(personalizationTokens || {}).length + 2,
        wordCount: template.body.split(/\s+/).length,
        estimatedReadTime: '< 1 min',
      },
    };
  },
});

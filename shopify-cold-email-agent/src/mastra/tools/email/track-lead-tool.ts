import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const trackLeadTool = createTool({
  id: 'track_lead',
  description: 'Track and update lead status in the outreach pipeline. Records all interactions, stage changes, and engagement metrics.',
  inputSchema: z.object({
    action: z.enum(['create', 'update', 'log_interaction', 'stage_change', 'get_status']).describe('Track action to perform'),
    leadData: z.object({
      id: z.string().optional().describe('Lead ID (required for update/log_interaction)'),
      email: z.string().describe('Lead email'),
      storeName: z.string(),
      storeUrl: z.string().optional(),
      ownerName: z.string().optional(),
      source: z.string().optional(),
      qualityScore: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
    interaction: z.object({
      type: z.enum(['email_sent', 'email_opened', 'link_clicked', 'email_replied', 'call_scheduled', 'demo_completed', 'meeting', 'note']),
      details: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    }).optional(),
    stageChange: z.object({
      from: z.string(),
      to: z.string(),
      reason: z.string().optional(),
    }).optional(),
    pipelineId: z.string().optional().describe('Pipeline ID'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    leadId: z.string().optional(),
    message: z.string(),
    lead: z.object({
      id: z.string(),
      email: z.string(),
      storeName: z.string(),
      currentStage: z.string(),
      stageHistory: z.array(z.object({
        stage: z.string(),
        enteredAt: z.string(),
        exitedAt: z.string().optional(),
      })),
      interactions: z.array(z.object({
        type: z.string(),
        timestamp: z.string(),
        details: z.string().optional(),
      })),
      metrics: z.object({
        emailsSent: z.number(),
        emailsOpened: z.number(),
        emailsReplied: z.number(),
        linkClicks: z.number(),
        lastActivity: z.string(),
        nextAction: z.string().optional(),
      }),
    }).optional(),
  }),
  execute: async ({ action, leadData, interaction, stageChange, pipelineId }) => {
    // In production, integrate with:
    // - CRM (HubSpot, Salesforce, Pipedrive)
    // - Lead tracking database (PostgreSQL, MongoDB)
    // - Mastra's built-in storage
    
    const pipeline = pipelineId || 'default';
    
    if (action === 'create' && leadData) {
      const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        success: true,
        leadId,
        message: `Created lead ${leadData.email} in pipeline ${pipeline}`,
        lead: {
          id: leadId,
          email: leadData.email,
          storeName: leadData.storeName,
          currentStage: 'new',
          stageHistory: [{
            stage: 'new',
            enteredAt: new Date().toISOString(),
          }],
          interactions: [],
          metrics: {
            emailsSent: 0,
            emailsOpened: 0,
            emailsReplied: 0,
            linkClicks: 0,
            lastActivity: new Date().toISOString(),
          },
        },
      };
    }
    
    if (action === 'update' && leadData?.id) {
      return {
        success: true,
        leadId: leadData.id,
        message: `Updated lead ${leadData.id}`,
      };
    }
    
    if (action === 'log_interaction' && interaction) {
      return {
        success: true,
        leadId: leadData?.id,
        message: `Logged ${interaction.type} interaction`,
      };
    }
    
    if (action === 'stage_change' && stageChange) {
      return {
        success: true,
        message: `Moved from "${stageChange.from}" to "${stageChange.to}"`,
      };
    }
    
    if (action === 'get_status' && leadData?.id) {
      return {
        success: true,
        leadId: leadData.id,
        message: `Retrieved status for lead ${leadData.id}`,
        lead: {
          id: leadData.id,
          email: leadData.email || '',
          storeName: leadData.storeName || '',
          currentStage: 'active',
          stageHistory: [{
            stage: 'active',
            enteredAt: new Date().toISOString(),
          }],
          interactions: [],
          metrics: {
            emailsSent: 1,
            emailsOpened: 0,
            emailsReplied: 0,
            linkClicks: 0,
            lastActivity: new Date().toISOString(),
          },
        },
      };
    }
    
    return {
      success: false,
      message: 'Invalid action or missing required data',
    };
  },
});

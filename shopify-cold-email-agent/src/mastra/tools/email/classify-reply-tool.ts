import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

type ReplyCategory = 'interested' | 'not_interested' | 'auto_reply' | 'meeting_request' | 'spam' | 'complaint' | 'out_of_office' | 'needs_human_review';
type Sentiment = 'positive' | 'neutral' | 'negative';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type ActionType = 'send_follow_up' | 'send_response' | 'schedule_meeting' | 'add_to_crm' | 'flag_for_review' | 'archive' | 'unsubscribe';
type ThreadStatus = 'active' | 'won' | 'lost' | 'pending';

export const classifyReplyTool = createTool({
  id: 'classify_reply',
  description: 'Classify an email reply to determine sentiment, intent, and required action. Uses AI to analyze email content.',
  inputSchema: z.object({
    emailData: z.object({
      id: z.string(),
      from: z.string(),
      subject: z.string(),
      body: z.string(),
      threadId: z.string().optional(),
    }),
    campaignContext: z.object({
      campaignName: z.string(),
      product: z.string(),
      sentAt: z.string(),
    }).optional(),
  }),
  outputSchema: z.object({
    classification: z.object({
      category: z.enum([
        'interested',
        'not_interested', 
        'auto_reply',
        'meeting_request',
        'spam',
        'complaint',
        'out_of_office',
        'needs_human_review',
      ]),
      confidence: z.number().min(0).max(1),
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
    }),
    analysis: z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
      objections: z.array(z.string()).optional(),
      purchaseIntent: z.enum(['none', 'low', 'medium', 'high']).optional(),
      suggestedResponse: z.string().optional(),
    }),
    nextAction: z.object({
      type: z.enum([
        'send_follow_up',
        'send_response',
        'schedule_meeting',
        'add_to_crm',
        'flag_for_review',
        'archive',
        'unsubscribe',
      ]),
      urgency: z.enum(['low', 'normal', 'high']),
      notes: z.string().optional(),
    }),
    threadUpdate: z.object({
      status: z.enum(['active', 'won', 'lost', 'pending']),
      stage: z.string().optional(),
    }),
  }),
  execute: async ({ emailData, campaignContext }) => {
    const body = emailData.body.toLowerCase();
    
    // Simple rule-based classification as fallback
    let category: ReplyCategory = 'needs_human_review';
    let sentiment: Sentiment = 'neutral';
    let priority: Priority = 'medium';
    
    if (body.includes('out of office') || body.includes('vacation') || body.includes('away until')) {
      category = 'out_of_office';
      sentiment = 'neutral';
      priority = 'low';
    } else if (body.includes('not interested') || body.includes('unsubscribe') || body.includes('remove me')) {
      category = 'not_interested';
      sentiment = 'negative';
      priority = 'low';
    } else if (body.includes('interested') || body.includes('yes') || body.includes('tell me more') || body.includes('sounds good')) {
      category = 'interested';
      sentiment = 'positive';
      priority = 'high';
    } else if (body.includes('meeting') || body.includes('call') || body.includes('schedule') || body.includes('calendar')) {
      category = 'meeting_request';
      sentiment = 'positive';
      priority = 'high';
    } else if (body.includes('spam') || body.includes('this is spam') || body.includes('phishing')) {
      category = 'spam';
      sentiment = 'negative';
      priority = 'low';
    } else if (body.includes('problem') || body.includes('issue') || body.includes('frustrated') || body.includes('complaint')) {
      category = 'complaint';
      sentiment = 'negative';
      priority = 'urgent';
    } else if (body.includes('thanks') || body.includes('thank you') || body.includes('received')) {
      category = 'auto_reply';
      sentiment = 'neutral';
      priority = 'low';
    }
    
    const getActionType = (cat: ReplyCategory): ActionType => {
      if (cat === 'interested') return 'schedule_meeting';
      if (cat === 'not_interested') return 'unsubscribe';
      if (cat === 'needs_human_review') return 'flag_for_review';
      return 'send_response';
    };
    
    const getThreadStatus = (cat: ReplyCategory): ThreadStatus => {
      if (cat === 'interested') return 'won';
      if (cat === 'not_interested') return 'lost';
      return 'active';
    };
    
    const getUrgency = (p: Priority): 'low' | 'normal' | 'high' => {
      if (p === 'high' || p === 'urgent') return 'high';
      return 'normal';
    };
    
    return {
      classification: {
        category,
        confidence: 0.75,
        sentiment,
        priority,
      },
      analysis: {
        summary: `Email from ${emailData.from} regarding: ${emailData.subject}`,
        keyPoints: ['Reply received', `Category: ${category}`],
        suggestedResponse: category === 'interested' 
          ? 'Send calendar link for demo call'
          : category === 'not_interested'
          ? 'Send confirmation and remove from sequence'
          : 'Await human review',
      },
      nextAction: {
        type: getActionType(category),
        urgency: getUrgency(priority),
        notes: 'Review and take appropriate action based on classification',
      },
      threadUpdate: {
        status: getThreadStatus(category),
        stage: category === 'interested' ? 'demo_scheduled' : undefined,
      },
    };
  },
});

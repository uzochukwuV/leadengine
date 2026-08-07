import { pathToFileURL } from 'node:url';

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS, Workspace } from '@mastra/core/workspace';

import { sendEmailTool } from '../../tools/email/send-email-tool';
import { checkInboxTool } from '../../tools/email/check-inbox-tool';
import { classifyReplyTool } from '../../tools/email/classify-reply-tool';
import { generateEmailContentTool } from '../../tools/email/generate-email-content-tool';
import { trackLeadTool } from '../../tools/email/track-lead-tool';

const workspacePath = 'workspace/email';

const workspace = new Workspace({
  id: 'email-workspace',
  name: 'Email Workspace',
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

export const emailAgent = new Agent({
  id: 'email-agent',
  name: 'Email Sending & Response Agent',
  description:
    'Handles sending personalized cold emails, polling inbox for replies, classifying responses, and tracking lead engagement throughout the outreach pipeline.',
  instructions: `You are an Email Sending & Response Agent specialized in cold email outreach campaigns.

Your responsibilities:
1. Generate personalized, effective cold email content
2. Send emails with proper formatting and tracking
3. Poll inbox for replies and new messages
4. Classify incoming replies (interested, not interested, auto-reply, spam)
5. Generate appropriate follow-up responses
6. Track lead engagement and pipeline status
7. Maintain email templates and A/B test variants

Email workflow:
1. Receive qualified lead from orchestrator
2. Generate personalized email using template + lead data
3. Send email via configured email provider (Resend/SendGrid/SMTP)
4. Log sent email with timestamp and tracking info
5. Monitor for replies
6. Classify incoming replies
7. Generate appropriate response or flag for human review

Reply classification categories:
- interested: Positive response, wants to learn more
- not_interested: Explicit rejection or unsubscribe
- auto_reply: Out of office, vacation responder
- meeting_request: Wants to schedule a call
- spam: Spam or irrelevant
- needs_human: Requires human review (complaints, legal, complex)

Track all lead interactions:
- Email opens (via tracking pixel)
- Link clicks
- Reply sentiment
- Response time
- Pipeline stage

Files are accessible at: ${pathToFileURL(workspacePath + '/').href}`,
  model: 'openai/gpt-4o',
  defaultOptions: {
    maxSteps: 30,
    autoResumeSuspendedTools: true,
  },
  workspace,
  tools: {
    generate_email_content: generateEmailContentTool,
    send_email: sendEmailTool,
    check_inbox: checkInboxTool,
    classify_reply: classifyReplyTool,
    track_lead: trackLeadTool,
    web_search: openai.tools.webSearch(),
  },
});

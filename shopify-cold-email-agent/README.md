# Shopify Cold Email Agent

A multi-agent AI system built with [Mastra](https://mastra.ai) for automated cold email outreach to Shopify merchants, powered by [Caspian](https://www.trycaspianai.com/) for messaging.

## Architecture

This system uses a **3-agent architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                          │
│              (User-facing supervisor agent)                     │
│  - Campaign management & scheduling                             │
│  - Coordinates sub-agents                                        │
│  - Performance reporting & user interaction                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   LEAD DISCOVERY AGENT  │   │     EMAIL AGENT          │
│  - Finds Shopify stores │   │  - Sends emails via      │
│  - Researches leads     │   │    Caspian/Resend        │
│  - Enriches contact     │   │  - Polls replies         │
│  - Evaluates quality    │   │  - Classifies responses  │
└─────────────────────────┘   └─────────────────────────┘
```

### Agent Responsibilities

1. **Orchestrator Agent** (`orchestrator`)
   - Main user interface for campaign management
   - Delegates tasks to specialized agents
   - Schedules and automates outreach workflows
   - Provides performance reports

2. **Lead Discovery Agent** (`leadDiscovery`)
   - Searches for Shopify stores matching criteria
   - Enriches leads with company/contact data
   - Evaluates lead quality and priority
   - Prepares qualified leads for outreach

3. **Email Agent** (`emailAgent`)
   - Generates personalized email content
   - Sends cold emails via Caspian or configured email provider
   - Polls inbox for replies
   - Classifies responses (interested/not interested/auto-reply)
   - Tracks lead engagement throughout pipeline

## Features

- **Automated Lead Discovery**: Search and qualify Shopify merchants
- **Personalized Email Generation**: AI-powered email personalization
- **Multi-Channel Outreach**: Email, Slack, Discord, Telegram via Caspian
- **Reply Classification**: Automatic categorization of responses
- **Lead Tracking**: Full pipeline visibility and engagement metrics
- **Scheduled Campaigns**: Automate daily lead discovery and outreach
- **Multi-Agent Coordination**: Supervisor pattern with specialized sub-agents
- **Caspian Integration**: Connect multiple messaging channels seamlessly

## Prerequisites

- Node.js >= 22.13.0
- npm or pnpm
- OpenAI API key (or compatible LLM provider)
- Caspian API key (for messaging channels)
- Email provider account (Resend, SendGrid, SMTP, or AWS SES)

## Quick Start

### 1. Clone and Install

```bash
npx create-mastra@latest --template agent-harness
cd shopify-cold-email-agent
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:
- `OPENAI_API_KEY` - For LLM capabilities
- `CASPIAN_API_KEY` - For messaging channels (get from trycaspianai.com)
- `EMAIL_PROVIDER` - Choose resend, sendgrid, smtp, or ses
- Provider-specific API keys

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) to access Mastra Studio.

## Caspian Integration

This project integrates with [Caspian](https://www.trycaspianai.com/) for multi-channel messaging:

### Available Caspian Tools

| Tool | Description |
|------|-------------|
| `caspianConnect` | Connect a messaging channel (email, Slack, Discord, Telegram, etc.) |
| `caspianSendMessage` | Send a message through any connected channel |
| `caspianGetMessages` | Retrieve recent messages from a channel |
| `caspianListChannels` | List all connected channels |
| `caspianCreateCampaign` | Send personalized email campaigns |

### Connecting Caspian Channels

After setting `CASPIAN_API_KEY`, connect channels:

```javascript
// In Mastra Studio, try:
// "Connect a Slack channel using the bot token xxx"
// "Connect email with username 'outreach'"
// "List all my connected channels"
```

### Supported Channels via Caspian

- **Email** - Your agent gets an email address (e.g., scout@agents.trycaspianai.com)
- **Slack** - Connect your Slack workspace
- **Discord** - Connect your Discord server
- **Telegram** - Connect a Telegram bot
- **SMS/Phone** - Bring your own Twilio/similar
- **X (Twitter)** - Direct messages
- **Bluesky** - Direct messages

## Usage

### Via Mastra Studio

1. Select the **orchestrator** agent
2. Try these example prompts:

```
Find me 10 Shopify stores in the beauty niche
Send an outreach campaign to my qualified leads
Check for new replies and respond to interested leads
Show me the status of my current campaign
Schedule a daily lead discovery run at 9 AM
Connect my Slack channel with token xxx
Send a message to John on Discord saying hello
Generate a campaign performance report
```

### Via API

```javascript
import { Mastra } from '@mastra/core/client';

const mastra = new Mastra({ baseUrl: 'http://localhost:4111' });

// Start a campaign
const result = await mastra.agents.orchestrator.generate({
  messages: [{ role: 'user', content: 'Find me 10 Shopify stores in fashion' }]
});

// Send via Caspian
const messageResult = await mastra.tools.caspianSendMessage({
  channelType: 'email',
  recipient: 'lead@example.com',
  subject: 'Quick question',
  message: 'Hi {{name}}, I found your store...'
});
```

## Campaign Workflows

### Outreach Campaign Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Search Leads │───▶│ Enrich Leads │───▶│ Generate     │
│              │    │              │    │ Emails       │
└──────────────┘    └──────────────┘    └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  Send Emails │
                                        │  (Caspian)   │
                                        └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │   Report     │
                                        └──────────────┘
```

### Reply Handler Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Fetch Emails │───▶│ Classify     │───▶│ Update Lead  │
│ (Caspian)    │    │ Replies      │    │ Status       │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Available Tools

### Lead Discovery Tools

| Tool | Description |
|------|-------------|
| `shopify_search` | Search for Shopify stores by niche/location |
| `enrich_lead` | Enrich lead with company/contact data |
| `evaluate_lead` | Score lead quality for outreach priority |

### Email Tools

| Tool | Description |
|------|-------------|
| `generate_email_content` | Generate personalized cold emails |
| `send_email` | Send email via configured provider |
| `check_inbox` | Poll inbox for new replies |
| `classify_reply` | Classify reply sentiment and intent |
| `track_lead` | Update lead pipeline and engagement |

### Caspian Messaging Tools

| Tool | Description |
|------|-------------|
| `caspian_connect` | Connect messaging channels |
| `caspian_send_message` | Send via any channel |
| `caspian_get_messages` | Get recent messages |
| `caspian_list_channels` | List connected channels |
| `caspian_create_campaign` | Bulk email campaigns |

### Orchestration Tools

| Tool | Description |
|------|-------------|
| `start_schedule` | Create recurring campaign schedules |
| `stop_schedule` | Pause a scheduled campaign |

## Reply Classification

The system classifies incoming replies into:

- **interested**: Positive response, wants to learn more
- **not_interested**: Explicit rejection or unsubscribe
- **auto_reply**: Out of office, vacation responder
- **meeting_request**: Wants to schedule a call
- **spam**: Spam or irrelevant
- **complaint**: Issue or problem reported
- **needs_human_review**: Complex situation requiring human input

## Integrations

### Messaging (via Caspian)
- **Email** - Your agent's email address on Caspian
- **Slack** - Workspace messaging
- **Discord** - Server messaging
- **Telegram** - Bot messaging
- **SMS** - Phone/SMS via Twilio

### Email Providers
- **Resend** (Recommended) - Easy setup, great deliverability
- **SendGrid** - Enterprise-grade email infrastructure
- **AWS SES** - Cost-effective at scale
- **SMTP** - Use your own mail server

### Lead Enrichment (Optional)
- Apollo.io - Contact discovery
- Hunter.io - Email finding
- Clearbit - Company data
- BuiltWith - Technology detection

## Project Structure

```
src/
├── mastra/
│   ├── agents/
│   │   ├── orchestrator/     # Main user-facing agent
│   │   ├── lead-discovery/   # Lead research agent
│   │   └── email/            # Email operations agent
│   ├── workflows/
│   │   ├── outreach-workflow.ts
│   │   └── reply-handler-workflow.ts
│   ├── tools/
│   │   ├── shopify/          # Lead discovery tools
│   │   ├── email/             # Email operation tools
│   │   └── caspian/           # Caspian messaging tools
│   └── index.ts               # Mastra configuration
└── workspace/
    ├── orchestrator/          # Orchestrator workspace
    ├── lead-discovery/        # Lead discovery workspace
    └── email/                 # Email workspace
```

## Learn More

- [Mastra Documentation](https://mastra.ai/docs)
- [Caspian SDK](https://www.trycaspianai.com/) - Multi-channel messaging
- [Multi-Agent Systems](https://mastra.ai/docs/agents/overview)
- [Supervisor Agents](https://mastra.ai/docs/agents/supervisor-agents)
- [Workflows](https://mastra.ai/docs/workflows/overview)

## License

Apache-2.0

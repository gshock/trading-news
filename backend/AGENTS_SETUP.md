# Pre-Market Agents Setup Guide

This document explains how to set up and run the AI-powered pre-market briefing agents that collect data from the web and analyze it using Microsoft Azure AI Foundry.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  Runs both agents in parallel, sends results to Foundry     │
├──────────────────┬──────────────────┬───────────────────────┤
│ ForexFactoryAgent│ FearGreedAgent   │   FoundryService      │
│ (Playwright)     │ (Playwright)     │   (Azure AI Inference)│
│ Scrapes USD      │ Scrapes CNN      │   Sends data to a     │
│ high-impact      │ Fear & Greed     │   deployed model for  │
│ events           │ Index            │   trading analysis    │
├──────────────────┴──────────────────┴───────────────────────┤
│               SchedulerService (node-cron)                  │
│  Runs at 9:00 AM EST Mon-Fri  |  On-demand via API         │
└─────────────────────────────────────────────────────────────┘
```

### New Files

| File | Purpose |
|------|---------|
| `src/agents/types.ts` | Type definitions for agent data |
| `src/agents/forexFactoryAgent.ts` | Scrapes ForexFactory for high-impact USD events |
| `src/agents/fearGreedAgent.ts` | Scrapes CNN Fear & Greed Index |
| `src/services/foundryService.ts` | Sends scraped data to Azure AI Foundry model |
| `src/services/agentOrchestratorService.ts` | Runs both agents in parallel, coordinates analysis |
| `src/services/schedulerService.ts` | Cron scheduler (9 AM EST) + on-demand trigger |
| `src/controllers/agentController.ts` | Express controller for agent API endpoints |
| `src/routes/agentRoutes.ts` | Route definitions for `/api/v1/agents/*` |

---

## Prerequisites

1. **Node.js 20+** — already required by the project
2. **Azure Subscription** — for Azure AI Foundry
3. **Azure CLI** — for authentication (`az login`)

---

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs the new packages:

| Package | Purpose |
|---------|---------|
| `playwright` | Headless browser for web scraping |
| `node-cron` | Cron-style job scheduler |
| `@azure-rest/ai-inference` | Azure AI Foundry model inference SDK |

---

## Step 2: Install Playwright Browsers

Playwright needs Chromium browser binaries to run the scraping agents:

```bash
npx playwright install chromium
```

> **Note**: This downloads ~150 MB of browser binaries. You only need Chromium (not Firefox/WebKit).

For deployment in Docker, add this to your Dockerfile:

```dockerfile
RUN npx playwright install --with-deps chromium
```

---

## Step 3: Set Up Azure AI Foundry

### 3a. Create an Azure AI Foundry Project

1. Go to [Azure AI Foundry](https://ai.azure.com)
2. Click **+ Create project**
3. Select your Azure subscription and resource group
4. Give it a name (e.g., `trading-news-ai`)
5. Select a region (e.g., `East US`)
6. Click **Create**

### 3b. Deploy a Model

1. Inside your Foundry project, go to **Model catalog**
2. Search for **GPT-4o** (recommended) or **GPT-4o-mini** (lower cost)
3. Click **Deploy** → **Deploy to a real-time endpoint**
4. Choose a deployment name (e.g., `gpt-4o`) — you'll need this later
5. Set capacity (start with 10K TPM for testing)
6. Click **Deploy**

### 3c. Get the Project Endpoint

1. In your Foundry project, go to **Overview**
2. Copy the **Project endpoint** URL — it looks like:
   ```
   https://<your-resource>.services.ai.azure.com/api/projects/<project-id>
   ```

### 3d. Set Up Authentication

The service uses `DefaultAzureCredential` from `@azure/identity`, which supports multiple auth methods. For local development:

```bash
az login
```

For production, use a **Managed Identity** or **Service Principal**. The identity needs the **Azure AI Developer** role on the Foundry resource:

```bash
# Assign role (replace values)
az role assignment create \
  --assignee <your-identity-object-id> \
  --role "Azure AI Developer" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>
```

---

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
# === Azure AI Foundry (Required for agent analysis) ===
FOUNDRY_PROJECT_ENDPOINT=https://<your-resource>.services.ai.azure.com/api/projects/<project-id>
FOUNDRY_MODEL_DEPLOYMENT_NAME=gpt-4o

# === Scheduler (Optional) ===
# Set to "false" to disable the automatic 9 AM EST scheduler
ENABLE_SCHEDULER=true
```

### Full `.env` example (with existing variables)

```env
# Existing variables
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SEND_MAIL_API_KEY=your-api-key
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

# New: Azure AI Foundry
FOUNDRY_PROJECT_ENDPOINT=https://your-resource.services.ai.azure.com/api/projects/your-project-id
FOUNDRY_MODEL_DEPLOYMENT_NAME=gpt-4o

# New: Scheduler control
ENABLE_SCHEDULER=true
```

---

## Step 5: Run the Server

```bash
npm run dev
```

You should see:

```
Azure Table Storage initialized
[Scheduler] Pre-market briefing scheduled for 9:00 AM EST, Mon-Fri
Server is running on 3000
```

---

## API Endpoints

### Trigger Briefing On-Demand

```bash
POST /api/v1/agents/run
Headers:
  x-api-key: <your SEND_MAIL_API_KEY>
```

**Example with curl:**

```bash
curl -X POST http://localhost:3000/api/v1/agents/run \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**

```json
{
  "forexEvents": {
    "agentName": "ForexFactoryAgent",
    "success": true,
    "data": [
      {
        "time": "8:30am",
        "currency": "USD",
        "impact": "high",
        "event": "Non-Farm Employment Change",
        "actual": "-92K",
        "forecast": "58K",
        "previous": "126K"
      }
    ],
    "collectedAt": "2026-03-06T13:55:00.000Z"
  },
  "fearGreed": {
    "agentName": "FearGreedAgent",
    "success": true,
    "data": {
      "score": 27,
      "label": "Fear",
      "previousClose": { "score": 33, "label": "Fear" },
      "oneWeekAgo": { "score": 38, "label": "Fear" },
      "oneMonthAgo": { "score": 46, "label": "Neutral" },
      "oneYearAgo": { "score": 17, "label": "Extreme Fear" },
      "timestamp": "2026-03-06T13:55:00.000Z"
    },
    "collectedAt": "2026-03-06T13:55:00.000Z"
  },
  "analysis": "## Market Sentiment Summary\n- Overall sentiment is **fearful**...",
  "generatedAt": "2026-03-06T13:55:05.000Z"
}
```

### Check Scheduler Status

```bash
GET /api/v1/agents/status
```

---

## How the Schedule Works

| Setting | Value |
|---------|-------|
| **Cron expression** | `0 9 * * 1-5` |
| **Time** | 9:00 AM |
| **Timezone** | `America/New_York` (EST/EDT) |
| **Days** | Monday through Friday |
| **Disable** | Set `ENABLE_SCHEDULER=false` in `.env` |

The scheduler automatically handles EST ↔ EDT daylight saving transitions.

---

## Docker Setup

Update your Dockerfile to include Playwright's Chromium dependencies:

```dockerfile
FROM node:20-alpine

# Install Playwright system dependencies for Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Playwright to use the system-installed Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

> **Alternative**: Use `mcr.microsoft.com/playwright:v1.52.0-noble` as the base image for full Playwright support.

---

## Adding More Agents

To add a new data collection agent:

1. Create a new file in `src/agents/` (e.g., `myNewAgent.ts`)
2. Implement a `collect()` method returning `AgentResult<YourDataType>`
3. Add the data type to `src/agents/types.ts`
4. Wire it into `AgentOrchestratorService` alongside the existing agents
5. Update the Foundry prompt in `FoundryService.analyzePreMarketData()` to include the new data

---

## Troubleshooting

### "Cannot find module 'playwright'"
Run `npm install` — the dependency may not be installed yet.

### "Chromium executable not found"
Run `npx playwright install chromium` to download the browser binary.

### "FOUNDRY_PROJECT_ENDPOINT must be set"
Add the Foundry environment variables to your `.env` file (see Step 4).

### "DefaultAzureCredential authentication failed"
Run `az login` to authenticate with Azure CLI for local development.

### Scheduler not running
- Check that `ENABLE_SCHEDULER` is not set to `"false"` in `.env`
- The scheduler only fires on weekdays (Mon-Fri)
- Verify your system clock and timezone settings

### Scraper returning empty data
- The websites may have changed their HTML structure
- Try running with `headless: false` in the agent code to debug visually
- Check if the site requires cookie consent or has CAPTCHA protections

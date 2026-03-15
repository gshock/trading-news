# Trading Daily — Backend

Express.js API server that orchestrates pre-market data collection agents, AI-powered analysis, and email delivery via Azure Communication Services.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
cd backend
npm install
npx playwright install chromium --with-deps
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `ACS_CONNECTION_STRING` | Azure Communication Services connection string |
| `ACS_SENDER_ADDRESS` | ACS MailFrom address |
| `BLOB_STORAGE_BASE_URL` | Azure Blob Storage base URL |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure Storage account name (local dev) |
| `AZURE_STORAGE_ACCOUNT_KEY` | Storage account key (local dev) |
| `FOUNDRY_PROJECT_ENDPOINT` | Azure AI Foundry project endpoint |
| `FOUNDRY_MODEL_DEPLOYMENT_NAME` | Model deployment name (e.g. `gpt-4o`) |
| `FOUNDRY_API_KEY` | Azure AI Foundry API key |
| `SEND_MAIL_API_KEY` | API key for route authentication |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `FRONTEND_URL` | Frontend URL for confirmation redirects |
| `API_URL` | Public backend URL (used in confirmation emails) |
| `ENABLE_SCHEDULER` | Enable/disable cron scheduler |

### Development

Start the development server with hot-reloading:

```bash
npm run dev
```

The server will be running at `http://localhost:3000`.

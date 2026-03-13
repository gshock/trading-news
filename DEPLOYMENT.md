# Deployment Guide - Trading News Backend

This guide covers how to deploy the Trading News Backend to Azure Container Apps.

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Docker installed (optional, ACR Build handles this)
- Access to Azure subscription and TraderRG resource group

## Azure Resources

- **Resource Group:** TraderRG (eastus2)
- **Container Registry:** ca9575ab0fccacr
- **Container App:** trading-news-backend
- **Environment:** trading-news-backend-env
- **Storage Account:** mrtraderstore6111
  - Blob Container: `trader-pub` (public)
  - Blob Container: `trader-cache` (private)
  - Table Storage: `subscriptions` table

## RBAC Permissions

The Container App's managed identity has the following roles assigned:

- **Key Vault Secrets User** (on trader-keyvault) - For reading secrets
- **Storage Table Data Contributor** (on mrtraderstore6111) - For table storage operations

## Environment Variables

The following environment variables are configured as secrets in Azure Container Apps:

### Email (Azure Communication Services)

- `ACS_CONNECTION_STRING` - Full connection string from your ACS resource (found in Azure Portal → Communication Services → Keys)
- `ACS_SENDER_ADDRESS` - The MailFrom address provisioned on your ACS email domain (e.g. `DoNotReply@<guid>.azurecomm.net`)

### Storage

- `BLOB_STORAGE_BASE_URL` - Azure Blob Storage base URL (e.g. `https://mrtraderstore6111.blob.core.windows.net`)

### API Security

- `SEND_MAIL_API_KEY` - Shared secret key that protects the `/send-mail` and `/agents/run` endpoints. Clients must pass this value in the `x-api-key` header (or as `Authorization: Bearer <key>`). Generate with: `openssl rand -hex 32`
- `CORS_ORIGINS` - Comma-separated list of allowed CORS origins (e.g. `https://polite-pond-0a06a4e0f.1.azurestaticapps.net`). If omitted, all origins are allowed (fine for development, lock down in production).

### Azure AI Foundry

- `FOUNDRY_PROJECT_ENDPOINT` - Your Azure AI Foundry project endpoint URL (e.g. `https://<hub>.services.ai.azure.com/models`)
- `FOUNDRY_MODEL_DEPLOYMENT_NAME` - The deployment name to use for inference (e.g. `gpt-4o`)
- `FOUNDRY_API_KEY` - API key from the Foundry portal **Keys & Endpoints** page

### Scheduler

- `ENABLE_SCHEDULER` - Set to `true` (default) to start the built-in cron job that fires at 5:30 AM EST Mon–Fri, or `false` to disable it (on-demand only via `/agents/run`)

### URLs

- `API_URL` - Public base URL of this backend, used to build the confirmation link in subscription emails (e.g. `https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1`)
- `FRONTEND_URL` - Public URL of the primary frontend, used to redirect users after email confirmation (e.g. `https://polite-pond-0a06a4e0f.1.azurestaticapps.net`)

**Note:** For local development with Table Storage, add `AZURE_STORAGE_ACCOUNT_KEY` to your `.env` file (see `backend/.env.example`). In Azure, the app uses managed identity automatically.

## Local Development with SSL

Both the backend and frontend are configured to serve over HTTPS locally using [mkcert](https://github.com/FiloSottile/mkcert)-issued certificates that your browser trusts.

### One-time setup

1. **Install mkcert** (requires winget or Chocolatey):
   ```powershell
   winget install mkcert
   ```

2. **Install the local CA** into your system trust store (run once, as Administrator):
   ```powershell
   mkcert -install
   ```
   > The Java `keytool` error that may appear can be safely ignored — it only affects Java apps.

3. **Generate certs** (run from the `backend/` folder — Vite also reads them from there):
   ```powershell
   cd backend
   mkcert localhost 127.0.0.1
   ```
   This creates `localhost+1.pem` and `localhost+1-key.pem` in `backend/`.

### How it works

- **Backend** (`src/index.ts`): At startup, looks for `localhost+1.pem` / `localhost+1-key.pem` in the working directory. If found, starts an HTTPS server; otherwise falls back to HTTP.
- **Frontend** (`vite.config.ts`): Points `server.https` at the same cert files in `../backend/`. Vite will serve on `https://localhost:5173`.

### Local `.env` settings

Make sure your `backend/.env` uses `https` URLs when running with SSL:

```env
FRONTEND_URL=https://localhost:5173
API_URL=https://localhost:3000/api/v1
```

> The cert files (`localhost+1.pem`, `localhost+1-key.pem`) are git-ignored and never committed.

## Deployment Steps

### 1. Build and Push Docker Image

Build the Docker image using Azure Container Registry Build:

```bash
az acr build --registry ca9575ab0fccacr --image trading-news-backend:latest .
```

This command:
- Uploads your source code to ACR
- Builds the Docker image in the cloud
- Pushes the image to the registry
- Takes ~30-60 seconds

### 2. Update Container App (if needed)

If the container app doesn't automatically pick up the new image, force an update:

```bash
az containerapp update --name trading-news-backend --resource-group TraderRG --image ca9575ab0fccacr.azurecr.io/trading-news-backend:latest
```

### 3. Verify Deployment

Check that the app is running:

```bash
curl https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/
```

Expected response: `Trading News Backend is running!`

Check the scheduler status (no auth required):

```bash
curl https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1/agents/status
```

Trigger an on-demand pre-market briefing (requires `x-api-key` header):

```bash
curl -X POST \
  https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1/agents/run \
  -H "x-api-key: YOUR_SEND_MAIL_API_KEY"
```

Manually send a previously-generated briefing email by its snapshot timestamp:

```bash
curl -X POST \
  https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1/send-mail \
  -H "x-api-key: YOUR_SEND_MAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"f": "20260228221640"}'
```

List all subscribers:

```bash
curl https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1/subscriptions
```

### 4. View Logs

To view container logs for debugging:

```bash
az containerapp logs show --name trading-news-backend --resource-group TraderRG --tail 50
```

Stream logs in real-time:

```bash
az containerapp logs tail --name trading-news-backend --resource-group TraderRG
```

## Updating Environment Variables

### Add or Update Secrets

Email (ACS) and storage secrets:

```bash
az containerapp secret set --name trading-news-backend --resource-group TraderRG \
  --secrets \
    "acs-connection-string=endpoint=https://<your-resource>.communication.azure.com/;accesskey=<key>" \
    "acs-sender-address=DoNotReply@<guid>.azurecomm.net" \
    "blob-storage-base-url=https://mrtraderstore6111.blob.core.windows.net/trader-pub"
```

API key and Foundry secrets:

```bash
az containerapp secret set --name trading-news-backend --resource-group TraderRG \
  --secrets \
    "send-mail-api-key=<your-generated-key>" \
    "foundry-project-endpoint=https://<hub>.services.ai.azure.com/models" \
    "foundry-model-deployment-name=gpt-4o" \
    "foundry-api-key=<your-foundry-api-key>"
```

### Link Secrets to Environment Variables

```bash
az containerapp update --name trading-news-backend --resource-group TraderRG \
  --set-env-vars \
    ACS_CONNECTION_STRING=secretref:acs-connection-string \
    ACS_SENDER_ADDRESS=secretref:acs-sender-address \
    BLOB_STORAGE_BASE_URL=secretref:blob-storage-base-url \
    SEND_MAIL_API_KEY=secretref:send-mail-api-key \
    FOUNDRY_PROJECT_ENDPOINT=secretref:foundry-project-endpoint \
    FOUNDRY_MODEL_DEPLOYMENT_NAME=secretref:foundry-model-deployment-name \
    FOUNDRY_API_KEY=secretref:foundry-api-key \
    ENABLE_SCHEDULER=true \
    CORS_ORIGINS="https://polite-pond-0a06a4e0f.1.azurestaticapps.net" \
    API_URL="https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1" \
    FRONTEND_URL="https://polite-pond-0a06a4e0f.1.azurestaticapps.net"
```

## Application URLs

**Base URL:** `https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Health check |
| POST | `/api/v1/agents/run` | `x-api-key` | Run a full pre-market briefing on demand (rate limit: 5/hr) |
| GET | `/api/v1/agents/status` | — | Get scheduler info and next run time |
| POST | `/api/v1/send-mail` | `x-api-key` | Re-send a briefing email by snapshot timestamp (rate limit: 10/hr) |
| POST | `/api/v1/subscribe` | `x-api-key` | Add a subscription |
| GET | `/api/v1/subscription/:email` | `x-api-key` | Get a single subscriber's record |
| PUT | `/api/v1/subscription/:email/status` | `x-api-key` | Update subscriber status (`active` / `unsubscribed`) |
| DELETE | `/api/v1/subscription/:email` | `x-api-key` | Delete a subscriber |
| GET | `/api/v1/subscriptions` | `x-api-key` | List all subscribers (optional `?status=active\|pending\|unsubscribed`) |

Protected endpoints (`x-api-key`) accept the key via:
- Header: `x-api-key: <key>`
- Header: `Authorization: Bearer <key>`

## Rollback

To rollback to a previous revision:

```bash
# List revisions
az containerapp revision list --name trading-news-backend --resource-group TraderRG --output table

# Activate a specific revision
az containerapp revision activate --name trading-news-backend --resource-group TraderRG --revision {revision-name}
```

## Scaling

The container app automatically scales based on HTTP traffic:
- **Min replicas:** 0 (scales to zero when idle)
- **Max replicas:** 10
- **CPU/Memory:** 0.5 CPU, 1Gi memory per replica

To modify scaling rules:

```bash
az containerapp update --name trading-news-backend --resource-group TraderRG --min-replicas 1 --max-replicas 20
```

## Troubleshooting

### Container won't start
Check logs for errors:
```bash
az containerapp logs show --name trading-news-backend --resource-group TraderRG
```

### Environment variables not loading
Verify secrets are configured:
```bash
az containerapp secret list --name trading-news-backend --resource-group TraderRG
```

### Image build fails
Check Dockerfile syntax and ensure all dependencies are in package.json:
```bash
docker build -t test .
```

**Note:** The image must be based on `node:20-slim` (Debian). Alpine is not officially supported by Playwright — `npx playwright install --with-deps` will fail on Alpine because it requires `apt-get`.

## CI/CD Integration

For automated deployments, add this to your CI/CD pipeline:

```bash
# Login to Azure
az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID

# Build and deploy
az acr build --registry ca9575ab0fccacr --image trading-news-backend:latest .

# Optional: Force update
az containerapp update --name trading-news-backend --resource-group TraderRG --image ca9575ab0fccacr.azurecr.io/trading-news-backend:latest
```

## Cost Optimization

Azure Container Apps charges based on:
- vCPU/Memory usage (per second)
- HTTP requests

With scale-to-zero enabled, you only pay when the app is actively handling requests.

## Support

For issues or questions, check:
- Azure Container Apps docs: https://learn.microsoft.com/en-us/azure/container-apps/
- Application logs in Azure Portal
- Container app metrics and monitoring

---

# Deploying a Frontend (Azure Static Web Apps)

Each frontend that consumes this backend is deployed as a separate **Azure Static Web App**. No Dockerfile is needed — Static Web Apps natively serves the `dist/` output of `vite build`.

## Prerequisites

- Azure CLI logged in (`az login`)
- Node.js 18+ (for the SWA CLI)
- The backend `SEND_MAIL_API_KEY` value at hand

> **Note:** The `az staticwebapp` CLI extension is preview-only and may fail to install. Use the **SWA CLI** method below instead — it's the official tool for Static Web Apps deployment.

## Environment Variables (Build-time)

Copy `frontend/.env.example` to `frontend/.env` and fill in the values:

```
VITE_API_URL=https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1
VITE_API_KEY=<same value as SEND_MAIL_API_KEY on the backend>
```

> **Note:** `VITE_*` variables are embedded into the JS bundle at build time. The API key will be visible in the browser. This is intentional — it gates which frontend clients can hit the backend, not which end-users.

## Deployment Steps

### 1. Create the Static Web App in the Portal

Go to the [Azure Portal](https://portal.azure.com) → Create a resource → **Static Web App**:

- **Resource group:** TraderRG
- **Name:** trading-news-frontend
- **Region:** East US 2
- **Deployment source:** Other (we'll deploy manually with the SWA CLI)

Click **Review + Create**. After creation, grab the **Deployment Token** from the app's **Manage deployment token** blade — you'll need it in step 3.

### 2. Build the Frontend

```bash
cd frontend
npm run build
```

This produces the `dist/` folder.

### 3. Deploy with the SWA CLI

```bash
npx @azure/static-web-apps-cli deploy ./dist \
  --deployment-token <your-deployment-token> \
  --env production
```

The SWA CLI uploads `dist/` (including `staticwebapp.config.json`) directly to Azure — no GitHub integration required.

### 4. Set Build-time Environment Variables in Azure

The `VITE_*` values are baked into the bundle at build time from your local `.env`, so Azure doesn't need them at runtime. However, if you want Azure to rebuild on its own (e.g. via GitHub Actions), set them as app settings:

```bash
az staticwebapp appsettings set \
  --name trading-news-frontend \
  --resource-group TraderRG \
  --setting-names \
    VITE_API_URL="https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/api/v1" \
    VITE_API_KEY="<your-api-key>"
```

### 3. Register the Frontend URL on the Backend (CORS)

Add the new frontend's URL to the backend's `CORS_ORIGINS` env var:

```bash
az containerapp update --name trading-news-backend --resource-group TraderRG \
  --set-env-vars \
    CORS_ORIGINS="https://trading-news-frontend.azurestaticapps.net,https://other-frontend.azurestaticapps.net"
```

Also update `FRONTEND_URL` if this is the primary frontend (used for email confirmation redirects):

```bash
az containerapp update --name trading-news-backend --resource-group TraderRG \
  --set-env-vars \
    FRONTEND_URL="https://trading-news-frontend.azurestaticapps.net"
```

### 4. Verify

Once the GitHub Actions workflow completes (check the **Actions** tab in your repo), visit the Static Web App URL shown in the portal and confirm subscribe/unsubscribe flows work end-to-end.

## Multiple Frontends

For each additional frontend app:
1. Create a new Static Web App pointing to the appropriate source folder/branch.
2. Set its own `VITE_API_URL` and `VITE_API_KEY` (the same key, or generate a new one per client if you want per-client key rotation).
3. Append its origin to `CORS_ORIGINS` on the backend.

## Custom Domain

```bash
az staticwebapp hostname set \
  --name trading-news-frontend \
  --resource-group TraderRG \
  --hostname www.yourdomain.com
```

Then add the TXT/CNAME validation record at your DNS provider as instructed by the CLI output.


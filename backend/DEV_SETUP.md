# Developer Setup Guide

This guide is for developers who need to test the application locally.

## Security Model

- **Development Storage**: Separate Azure Storage account for testing (`mrtraderstore6111dev`)
- **Production Storage**: Protected storage account (`mrtraderstore6111`) - **no dev access**
- Developers get access keys only to the dev storage account
- Production keys are managed by the project lead only

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd c:\projects\trading-news\backend
npm install
```

### 2. Create Your .env File

Copy the example file:
```bash
copy .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` with these values (provided by your project lead):

```dotenv
# Email Configuration (use test credentials)
EMAIL_USER=test-account@gmail.com
EMAIL_PASS=test-app-password

# Azure Blob Storage (dev environment)
BLOB_STORAGE_BASE_URL=https://mrtraderstore6111dev.blob.core.windows.net/trader-pub

# Azure Table Storage (dev environment)
AZURE_STORAGE_ACCOUNT_NAME=mrtraderstore6111dev
AZURE_STORAGE_ACCOUNT_KEY=ask-your-project-lead-for-dev-key
AZURE_TABLE_NAME=subscriptions

# Server Configuration
PORT=3000
```

### 4. Run the Application

```bash
npm run dev
```

The server will start at http://localhost:3000/

### 5. Test the API

```bash
# Test email endpoint
curl "http://localhost:3000/api/v1/send-mail?f=20250227_120000"

# Create a subscription
curl -X POST http://localhost:3000/api/v1/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","topics":"stocks,crypto","source":"webform"}'

# Get subscription status
curl http://localhost:3000/api/v1/subscription/test@example.com

# Update subscription status
curl -X PUT http://localhost:3000/api/v1/subscription/test@example.com/status \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

# List all active subscriptions
curl http://localhost:3000/api/v1/subscriptions?status=active

# Delete a subscription
curl -X DELETE http://localhost:3000/api/v1/subscription/test@example.com
```

## What You Have Access To

✅ **Dev Storage Account**: Full access for testing
- Dev blob containers (test data)
- Dev subscriptions table
- Can create/delete test data freely

✅ **Source Code**: Read and contribute via Git
- Create feature branches
- Submit pull requests
- Run tests locally

✅ **Local Development**: Full debugging capabilities
- Run with `npm run dev`
- Use VS Code debugger (F5)
- View logs and errors

## What You DON'T Have Access To

❌ **Production Storage Account** (`mrtraderstore6111`)
- No access to production subscriber data
- No access to production blob storage
- No production storage account keys

❌ **Production Container App** (`trading-news-backend`)
- Cannot deploy to production
- Cannot view production logs
- Cannot modify production secrets

❌ **Azure Key Vault** (`trader-keyvault`)
- Cannot access production credentials
- Cannot modify secrets

❌ **Production Email Credentials**
- Use test Gmail account only

## Safety Guidelines

1. **Never commit `.env` files** - They contain secrets (already in .gitignore)
2. **Never hardcode credentials** - Always use environment variables
3. **Test with fake data** - Don't use real email addresses in dev
4. **Ask before creating new tables** - Coordinate with project lead
5. **Report security issues immediately** - If you find vulnerabilities

## Data Isolation

| Environment | Storage Account | Table Name | Email Account |
|-------------|----------------|------------|---------------|
| **Development** | mrtraderstore6111dev | subscriptions | test@gmail.com |
| **Production** | mrtraderstore6111 | subscriptions | myresumator@gmail.com |

## Debugging

### Enable Detailed Logs

Add to your `.env`:
```dotenv
DEBUG=*
NODE_ENV=development
```

### Use VS Code Debugger

1. Press F5 to start debugging
2. Set breakpoints in your code
3. Step through code execution
4. Inspect variables and state

### View Table Storage Data

Use Azure Storage Explorer (free tool):
1. Download: https://azure.microsoft.com/en-us/products/storage/storage-explorer/
2. Connect using your dev storage account name and key
3. Browse tables and view/edit entities

## Common Issues

### "Table not found" Error

The table is created automatically on first run. If you see this error:
1. Make sure `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` are correct
2. Check the console for "Table 'subscriptions' created successfully"
3. Verify the storage account exists in Azure

### "Authentication failed" Error

Your storage account key may be incorrect:
1. Ask project lead for updated dev key
2. Update `AZURE_STORAGE_ACCOUNT_KEY` in `.env`
3. Restart the server

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Need Help?

Contact your project lead if you need:
- Dev storage account key
- Test email credentials
- Help with setup or debugging
- Access to additional resources

## Next Steps

After setup:
1. Review [TABLE_STORAGE.md](TABLE_STORAGE.md) for API documentation
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) to understand production architecture
3. Create a feature branch for your work
4. Write tests for new features
5. Submit PR when ready

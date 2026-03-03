# Azure Table Storage Integration

This application uses Azure Table Storage to manage email subscriptions for the trading news service.

## Schema

The `subscriptions` table uses the following schema:

| Field | Type | Description |
|-------|------|-------------|
| `partitionKey` | string | "recipients" (or first letter for sharding) |
| `rowKey` | string | Normalized email (lowercased) |
| `status` | string | "pending" \| "active" \| "unsubscribed" |
| `createdUtc` | string | ISO 8601 timestamp |
| `confirmedUtc` | string? | ISO 8601 timestamp (when confirmed) |
| `confirmToken` | string? | Hashed confirmation token |
| `ip` | string? | IP address of subscriber |
| `ua` | string? | User agent string |
| `topics` | string? | CSV or JSON string of topics |
| `source` | string | Source of subscription (e.g., "webform", "api") |

## API Endpoints

### POST /api/v1/subscribe
Create a new subscription (status: pending)

**Request Body:**
```json
{
  "email": "user@example.com",
  "topics": "stocks,crypto",
  "source": "webform"
}
```

**Response:**
```json
{
  "message": "Subscription created",
  "email": "user@example.com"
}
```

### GET /api/v1/subscription/:email
Get subscription details

**Response:**
```json
{
  "partitionKey": "recipients",
  "rowKey": "user@example.com",
  "status": "active",
  "createdUtc": "2026-03-02T18:00:00.000Z",
  "confirmedUtc": "2026-03-02T18:30:00.000Z",
  "topics": "stocks,crypto",
  "source": "webform"
}
```

### PUT /api/v1/subscription/:email/status
Update subscription status

**Request Body:**
```json
{
  "status": "active"
}
```

**Response:**
```json
{
  "message": "Subscription updated",
  "email": "user@example.com",
  "status": "active"
}
```

### GET /api/v1/subscriptions?status=active
List subscriptions by status

**Query Parameters:**
- `status` - Filter by status (pending, active, unsubscribed). Default: active

**Response:**
```json
{
  "count": 2,
  "subscriptions": [
    {
      "partitionKey": "recipients",
      "rowKey": "user1@example.com",
      "status": "active",
      "createdUtc": "2026-03-02T18:00:00.000Z"
    },
    {
      "partitionKey": "recipients",
      "rowKey": "user2@example.com",
      "status": "active",
      "createdUtc": "2026-03-02T19:00:00.000Z"
    }
  ]
}
```

### DELETE /api/v1/subscription/:email
Delete a subscription

**Response:**
```json
{
  "message": "Subscription deleted",
  "email": "user@example.com"
}
```

## Local Development

For local development, configure these environment variables in your `.env` file:

```bash
# Development storage account (safe to share with team)
AZURE_STORAGE_ACCOUNT_NAME=mrtraderstore6111dev
AZURE_STORAGE_ACCOUNT_KEY=your-dev-key-here
AZURE_TABLE_NAME=subscriptions

# Production uses: mrtraderstore6111 (keep private!)
```

**For Project Leads:** Run `setup-dev-storage.ps1` to create a separate dev storage account.

**For Students:** See [DEV_SETUP.md](DEV_SETUP.md) for complete setup instructions.

## Azure Deployment

In Azure Container Apps, the application uses **Managed Identity** to access Table Storage. No credentials are needed in configuration.

### Required RBAC Role

The Container App's managed identity must have the **Storage Table Data Contributor** role:

```bash
# Get the Container App's principal ID
PRINCIPAL_ID=$(az containerapp show --name trading-news-backend --resource-group TraderRG --query identity.principalId -o tsv)

# Assign the role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Table Data Contributor" \
  --scope $(az storage account show --name mrtraderstore6111 --resource-group TraderRG --query id -o tsv)
```

## Table Initialization

The `subscriptions` table is automatically created on application startup if it doesn't exist. You'll see this log message:

```
Table 'subscriptions' created successfully
```

Or if it already exists:

```
Table 'subscriptions' already exists
```

## Usage Example

```typescript
import { TableStorageService } from "./services/tableStorageService.js";

const tableService = new TableStorageService();

// Add a subscription
await tableService.addSubscription("user@example.com", {
  status: "pending",
  topics: "stocks,crypto",
  source: "webform",
  ip: "192.168.1.1",
  ua: "Mozilla/5.0...",
});

// Get a subscription
const subscription = await tableService.getSubscription("user@example.com");

// Update status to active
await tableService.updateSubscriptionStatus(
  "user@example.com",
  "active",
  new Date().toISOString()
);

// List active subscriptions
const activeSubscriptions = await tableService.listSubscriptionsByStatus("active");

// Delete a subscription
await tableService.deleteSubscription("user@example.com");
```

## Security Notes

- Emails are automatically normalized (lowercased and trimmed) before storage
- Confirmation tokens should be hashed before storage
- IP addresses and user agents are optional but recommended for audit purposes
- Use the `topics` field to segment subscriptions by interest categories
- The `source` field helps track subscription origin (webform, api, import, etc.)

## Scaling Considerations

The current implementation uses `"recipients"` as the partition key. For high-scale scenarios (>1M subscribers), consider sharding by:

- First letter of email: `normalizedEmail[0]`
- Geographic region
- Subscription date (year-month)

Update the `partitionKey` in `TableStorageService.addSubscription()` method accordingly.

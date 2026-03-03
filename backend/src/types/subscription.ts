export interface SubscriptionEntity {
  partitionKey: string; // e.g., "recipients" or first letter of email for sharding
  rowKey: string; // normalized email (lowercased)
  status: "pending" | "active" | "unsubscribed";
  createdUtc: string; // ISO timestamp
  confirmedUtc?: string; // ISO timestamp
  confirmToken?: string; // hashed token
  ip?: string;
  ua?: string; // user agent
  topics?: string; // CSV or JSON string
  source?: string; // e.g., "webform" "mail-app" "trading-app"
}

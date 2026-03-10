import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import type { SubscriptionEntity } from "../types/subscription.js";

export class TableStorageService {
  private tableClient: TableClient;
  private tableName: string;

  constructor() {
    // Environment-specific configuration
    const storageAccountName =
      process.env.AZURE_STORAGE_ACCOUNT_NAME || "mrtraderstore6111";
    this.tableName = process.env.AZURE_TABLE_NAME || "subscriptions";
    const tableEndpoint = `https://${storageAccountName}.table.core.windows.net`;

    // Use managed identity in Azure, account key for local development
    if (process.env.AZURE_STORAGE_ACCOUNT_KEY) {
      // Local development with account key
      const credential = new AzureNamedKeyCredential(
        storageAccountName,
        process.env.AZURE_STORAGE_ACCOUNT_KEY,
      );
      this.tableClient = new TableClient(
        tableEndpoint,
        this.tableName,
        credential,
      );
    } else {
      // Azure Container Apps with managed identity
      const credential = new DefaultAzureCredential();
      this.tableClient = new TableClient(
        tableEndpoint,
        this.tableName,
        credential,
      );
    }
  }

  /**
   * Creates the subscriptions table if it doesn't exist
   */
  async ensureTableExists(): Promise<void> {
    try {
      await this.tableClient.createTable();
      console.log(`Table '${this.tableName}' created successfully`);
    } catch (error: any) {
      if (error?.statusCode === 409) {
        // Table already exists, this is fine
        console.log(`Table '${this.tableName}' already exists`);
      } else {
        throw new Error(
          `Failed to create table: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  /**
   * Add a new subscription
   */
  async addSubscription(
    email: string,
    options: {
      status?: "pending" | "active" | "unsubscribed";
      confirmToken?: string;
      ip?: string;
      ua?: string;
      topics?: string;
      source?: string;
    } = {},
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const partitionKey = "recipients"; // Or use: normalizedEmail[0] for sharding

    const entity = {
      partitionKey,
      rowKey: normalizedEmail,
      status: options.status || "pending",
      createdUtc: new Date().toISOString(),
      confirmToken: options.confirmToken,
      ip: options.ip,
      ua: options.ua,
      topics: options.topics,
      source: options.source || "api",
    };

    await this.tableClient.createEntity(entity);
  }

  /**
   * Get a subscription by email
   */
  async getSubscription(email: string): Promise<SubscriptionEntity | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const partitionKey = "recipients";

    try {
      const entity = await this.tableClient.getEntity<SubscriptionEntity>(
        partitionKey,
        normalizedEmail,
      );
      return entity as SubscriptionEntity;
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async resetSubscription(
    email: string,
    confirmToken: string,
    topics?: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    // Read the existing entity to preserve properties not being reset (ip, ua, source)
    const existing = await this.getSubscription(normalizedEmail);
    const entity: any = {
      partitionKey: "recipients",
      rowKey: normalizedEmail,
      status: "pending",
      createdUtc: new Date().toISOString(),
      confirmToken,
      // confirmedUtc is intentionally omitted so the Replace wipes it out
    };
    if (existing?.ip) entity.ip = existing.ip;
    if (existing?.ua) entity.ua = existing.ua;
    if (existing?.source) entity.source = existing.source;
    const topicsValue = topics ?? existing?.topics;
    if (topicsValue !== undefined) entity.topics = topicsValue;
    // Use Replace mode to guarantee confirmedUtc (and any other stale field) is removed
    await this.tableClient.updateEntity(entity, "Replace");
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    email: string,
    status: "pending" | "active" | "unsubscribed",
    confirmedUtc?: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const partitionKey = "recipients";

    const entity: any = {
      partitionKey,
      rowKey: normalizedEmail,
      status,
    };

    if (confirmedUtc) {
      entity.confirmedUtc = confirmedUtc;
    }

    await this.tableClient.updateEntity(entity, "Merge");
  }

  /**
   * List all subscriptions with a specific status
   */
  async listSubscriptionsByStatus(
    status: "pending" | "active" | "unsubscribed",
  ): Promise<SubscriptionEntity[]> {
    const entities = this.tableClient.listEntities<SubscriptionEntity>({
      queryOptions: { filter: `status eq '${status}'` },
    });

    const results: SubscriptionEntity[] = [];
    for await (const entity of entities) {
      results.push(entity as SubscriptionEntity);
    }

    return results;
  }

  /**
   * Find a subscription by its confirmation token
   */
  async getSubscriptionByToken(
    token: string,
  ): Promise<SubscriptionEntity | null> {
    // Escape single quotes to keep the OData string literal well-formed
    const safeToken = token.replace(/'/g, "''");
    const entities = this.tableClient.listEntities<SubscriptionEntity>({
      queryOptions: { filter: `confirmToken eq '${safeToken}'` },
    });

    for await (const entity of entities) {
      return entity as SubscriptionEntity;
    }

    return null;
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const partitionKey = "recipients";

    await this.tableClient.deleteEntity(partitionKey, normalizedEmail);
  }
}

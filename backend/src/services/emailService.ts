import { EmailClient, type EmailMessage } from "@azure/communication-email";
import { extname } from "node:path";
import axios from "axios";
import type { SnapshotIndex } from "../types/snapshot.js";
import type { PreMarketBriefing, ForexEvent, AgentResult } from "../agents/types.js";
import { BlobStorageService } from "./blobStorageService.js";
import { TradingUpdateTemplate } from "../templates/tradingUpdate.template.js";
import { PreMarketBriefingTemplate } from "../templates/preMarketBriefing.template.js";
import { ConfirmSubscriptionTemplate } from "../templates/confirmSubscription.template.js";
import { formatLongDate } from "../utils/formatDate.js";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export class EmailService {
  private client: EmailClient;
  private senderAddress: string;
  private blobStorageService: BlobStorageService;
  private tradingUpdateTemplate: TradingUpdateTemplate;
  private preMarketBriefingTemplate: PreMarketBriefingTemplate;
  private confirmSubscriptionTemplate: ConfirmSubscriptionTemplate;

  constructor() {
    const connectionString = process.env.ACS_CONNECTION_STRING;
    const senderAddress = process.env.ACS_SENDER_ADDRESS;
    if (!connectionString || !senderAddress) {
      throw new Error(
        "EmailService configuration error: ACS_CONNECTION_STRING and ACS_SENDER_ADDRESS environment variables must be set.",
      );
    }

    this.client = new EmailClient(connectionString);
    this.senderAddress = senderAddress;
    this.blobStorageService = new BlobStorageService();
    this.tradingUpdateTemplate = new TradingUpdateTemplate();
    this.preMarketBriefingTemplate = new PreMarketBriefingTemplate();
    this.confirmSubscriptionTemplate = new ConfirmSubscriptionTemplate();
  }

  private async fetchAsBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data).toString("base64");
  }

  async sendTradingUpdate(
    snapshotData: SnapshotIndex,
    recipients: string[],
    title: string,
    forexEvents?: AgentResult<ForexEvent[]>,
    analysis?: string | null,
  ): Promise<void> {
    const html = this.tradingUpdateTemplate.render(snapshotData, title, forexEvents, analysis);

    try {
      const attachments = await Promise.all(
        snapshotData.entries.map(async (entry) => {
          const ext = extname(entry.fileName).toLowerCase();
          const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
          const blobUrl = this.blobStorageService.getBlobUrl(entry.path);
          const contentInBase64 = await this.fetchAsBase64(blobUrl);
          return {
            name: entry.fileName,
            contentType,
            contentInBase64,
            contentId: `chart-${entry.symbol.toLowerCase()}`,
          };
        }),
      );

      const message: EmailMessage = {
        senderAddress: this.senderAddress,
        content: {
          subject: `${title} — ${formatLongDate(snapshotData.createdUtc)}`,
          html,
        },
        recipients: {
          bcc: recipients.map((email) => ({ address: email })),
        },
        attachments,
      };
      const poller = await this.client.beginSend(message);
      await poller.pollUntilDone();
    } catch (error) {
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async sendPreMarketBriefing(
    briefing: PreMarketBriefing,
    recipients: string[],
  ): Promise<void> {
    const html = this.preMarketBriefingTemplate.render(briefing);
    const date = formatLongDate(briefing.generatedAt);

    const attachments: { name: string; contentType: string; contentInBase64: string; contentId: string }[] = [];
    if (briefing.spyChartImage) {
      attachments.push({
        name: "spy-chart.png",
        contentType: "image/png",
        contentInBase64: briefing.spyChartImage.toString("base64"),
        contentId: "spy-chart",
      });
    }

    const message: EmailMessage = {
      senderAddress: this.senderAddress,
      content: {
        subject: `Pre-Market Briefing — ${date}`,
        html,
      },
      recipients: {
        bcc: recipients.map((email) => ({ address: email })),
      },
      attachments,
    };

    try {
      const poller = await this.client.beginSend(message);
      await poller.pollUntilDone();
    } catch (error) {
      throw new Error(
        `Failed to send pre-market briefing email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async sendConfirmationEmail(
    email: string,
    confirmToken: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const confirmUrl = `${frontendUrl}?token=${confirmToken}`;
    const html = this.confirmSubscriptionTemplate.render(email, confirmUrl);

    const message: EmailMessage = {
      senderAddress: this.senderAddress,
      content: {
        subject: "Confirm your Market Snapshot subscription",
        html,
      },
      recipients: {
        to: [{ address: email }],
      },
    };

    try {
      const poller = await this.client.beginSend(message);
      await poller.pollUntilDone();
    } catch (error) {
      throw new Error(
        `Failed to send confirmation email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

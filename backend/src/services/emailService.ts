import nodemailer from "nodemailer";
import { extname } from "node:path";
import type { SnapshotIndex } from "../types/snapshot.js";
import type { PreMarketBriefing } from "../agents/types.js";
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
  private transporter;
  private blobStorageService: BlobStorageService;
  private tradingUpdateTemplate: TradingUpdateTemplate;
  private preMarketBriefingTemplate: PreMarketBriefingTemplate;
  private confirmSubscriptionTemplate: ConfirmSubscriptionTemplate;

  constructor() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (!emailUser || !emailPass) {
      throw new Error(
        "EmailService configuration error: EMAIL_USER and EMAIL_PASS environment variables must be set.",
      );
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    this.blobStorageService = new BlobStorageService();
    this.tradingUpdateTemplate = new TradingUpdateTemplate();
    this.preMarketBriefingTemplate = new PreMarketBriefingTemplate();
    this.confirmSubscriptionTemplate = new ConfirmSubscriptionTemplate();
  }

  async sendTradingUpdate(
    snapshotData: SnapshotIndex,
    recipients: string[],
    title: string,
  ): Promise<void> {
    const html = this.tradingUpdateTemplate.render(snapshotData, title);

    const attachments = snapshotData.entries.map((entry) => {
      const ext = extname(entry.fileName).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      return {
        filename: entry.fileName,
        path: this.blobStorageService.getBlobUrl(entry.path),
        cid: `chart-${entry.symbol.toLowerCase()}`,
        contentType,
      };
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      bcc: recipients,
      subject: `${title} — ${formatLongDate(snapshotData.createdUtc)}`,
      html,
      attachments,
    };

    try {
      await this.transporter.sendMail(mailOptions);
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

    const attachments: { filename: string; content: Buffer; cid: string; contentType: string }[] = [];
    if (briefing.spyChartImage) {
      attachments.push({
        filename: "spy-chart.png",
        content: briefing.spyChartImage,
        cid: "spy-chart",
        contentType: "image/png",
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      bcc: recipients,
      subject: `Pre-Market Briefing — ${date}`,
      html,
      attachments,
    };

    try {
      await this.transporter.sendMail(mailOptions);
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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Confirm your Market Snapshot subscription",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(
        `Failed to send confirmation email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

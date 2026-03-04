import nodemailer from "nodemailer";
import type { SnapshotIndex } from "../types/snapshot.js";
import { BlobStorageService } from "./blobStorageService.js";
import { TradingUpdateTemplate } from "../templates/tradingUpdate.template.js";

export class EmailService {
  private transporter;
  private blobStorageService: BlobStorageService;
  private tradingUpdateTemplate: TradingUpdateTemplate;

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
  }

  async sendTradingUpdate(
    snapshotData: SnapshotIndex,
    recipients: string[],
  ): Promise<void> {
    const html = this.tradingUpdateTemplate.render(snapshotData);

    const attachments = snapshotData.entries.map((entry) => ({
      filename: entry.fileName,
      path: this.blobStorageService.getBlobUrl(entry.path),
      cid: `chart-${entry.symbol.toLowerCase()}`,
    }));

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients,
      subject: `Trading Update ${snapshotData.folderTimestamp}`,
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
}

import nodemailer from "nodemailer";
import type { SnapshotIndex } from "../types/snapshot.js";
import { BlobStorageService } from "./blobStorageService.js";

export class EmailService {
  private transporter;
  private blobStorageService: BlobStorageService;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    this.blobStorageService = new BlobStorageService();
  }

  //  Creates HTML email content
  private createEmailHtml(snapshotData: SnapshotIndex): string {
    const { folderTimestamp, createdUtc, entries } = snapshotData;
    const date = new Date(createdUtc).toLocaleDateString();
    const time = new Date(createdUtc).toLocaleTimeString();

    let imagesHtml = "";
    entries.forEach((entry) => {
      const imageUrl = this.blobStorageService.getBlobUrl(entry.path);
      imagesHtml += `
        <div style="margin: 20px 0; text-align: center;">
          <h3 style="color: #333; margin-bottom: 10px;">${entry.symbol}</h3>
          <img src="${imageUrl}" alt="${entry.symbol} Trading Chart" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
        </div>
      `;
    });

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
            .header-info { background-color: #ecf0f1; padding: 15px; border-radius: 4px; margin-bottom: 30px; }
            .header-info p { margin: 5px 0; color: #7f8c8d; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📈 Trading News Update</h1>
            <div class="header-info">
              <p><strong>Snapshot:</strong> ${folderTimestamp}</p>
              <p><strong>Generated:</strong> ${date} at ${time}</p>
              <p><strong>Charts:</strong> ${entries.length} symbols</p>
            </div>
            ${imagesHtml}
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
            <p style="text-align: center; color: #95a5a6; font-size: 14px;">
              This is an automated trading update. Generated on ${new Date().toLocaleString()}.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  //  Sends trading update email to recipients
  async sendTradingUpdate(
    snapshotData: SnapshotIndex,
    recipients: string[],
  ): Promise<void> {
    const htmlContent = this.createEmailHtml(snapshotData);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients,
      subject: `Trading Update ${snapshotData.folderTimestamp}`,
      html: htmlContent,
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

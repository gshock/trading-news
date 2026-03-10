import type { Request, Response } from "express";
import type { BlobStorageService } from "../services/blobStorageService.js";
import type { EmailService } from "../services/emailService.js";
import { TableStorageService } from "../services/tableStorageService.js";

export class EmailController {
  private tableStorageService: TableStorageService;

  constructor(
    private blobStorageService: BlobStorageService,
    private emailService: EmailService,
  ) {
    this.tableStorageService = new TableStorageService();
    this.sendMail = this.sendMail.bind(this);
  }

  async sendMail(req: Request, res: Response): Promise<void> {
    try {
      // Get folder timestamp
      const folderTimestamp = req.body.f as string;

      if (!folderTimestamp) {
        res.status(400).json({
          error: "Bad request",
          message: "Missing folder in request body",
        });
        return;
      }

      const title = (req.body.title as string) || "Market Snapshot";

      // Fetch snapshot data from blob storage
      const snapshotData =
        await this.blobStorageService.getSnapshotIndex(folderTimestamp);

      // Get active subscribers from table storage
      const subscribers = await this.tableStorageService.listSubscriptionsByStatus("active");
      const recipients = subscribers.map((s) => s.rowKey);

      if (recipients.length === 0) {
        res.status(200).json({
          message: "No active subscribers — email skipped",
          folderTimestamp,
          recipientCount: 0,
          chartCount: snapshotData.count,
        });
        return;
      }

      // Send email
      await this.emailService.sendTradingUpdate(
        snapshotData,
        recipients,
        title,
      );

      res.status(200).json({
        message: "Email sent successfully",
        folderTimestamp,
        recipientCount: recipients.length,
        chartCount: snapshotData.count,
      });
    } catch (error) {
      console.error("Error in sendMail:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}

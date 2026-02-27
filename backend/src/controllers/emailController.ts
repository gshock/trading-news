import type { Request, Response } from "express";
import { BlobStorageService } from "../services/blobStorageService.js";
import { EmailService } from "../services/emailService.js";

export class EmailController {
  private blobStorageService: BlobStorageService;
  private emailService: EmailService;

  constructor() {
    this.blobStorageService = new BlobStorageService();
    this.emailService = new EmailService();
  }

  async sendMail(req: Request, res: Response): Promise<void> {
    try {
      // Get folder timestamp
      const folderTimestamp = req.query.f as string;

      if (!folderTimestamp) {
        res.status(400).json({
          error: "Bad request",
          message: "Missing folder query parameter",
        });
        return;
      }

      // Fetch snapshot data from blob storage
      const snapshotData =
        await this.blobStorageService.getSnapshotIndex(folderTimestamp);

      const recipients = ["segundaviddev@gmail.com"];

      // Send email
      await this.emailService.sendTradingUpdate(snapshotData, recipients);

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

import axios from "axios";
import type { SnapshotIndex } from "../types/snapshot.js";

export class BlobStorageService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BLOB_STORAGE_BASE_URL || "";
    if (!this.baseUrl) {
      throw new Error("BLOB_STORAGE_BASE_URL environment variable is required");
    }
  }

  // Fetches the snapshot index.json file from Azure blob storage
  async getSnapshotIndex(folderTimestamp: string): Promise<SnapshotIndex> {
    const url = `${this.baseUrl}/snapshot/${folderTimestamp}/index.json`;

    try {
      const response = await axios.get<SnapshotIndex>(url);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch snapshot index: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  //  Builds the full URL for a given blob path
  getBlobUrl(path: string): string {
    return `${this.baseUrl}/${path}`;
  }
}

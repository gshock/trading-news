import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import type { SnapshotEntry, SnapshotIndex } from "../types/snapshot.js";

const CONTAINER_NAME = "trader-pub";
const SNAPSHOT_FOLDER = "snapshot";

/**
 * Writes ORB chart images and an index.json manifest to Azure Blob Storage
 * under `snapshot/{folderTimestamp}/`.
 *
 * Authentication priority:
 *   1. AZURE_STORAGE_CONNECTION_STRING  (connection string)
 *   2. AZURE_STORAGE_ACCOUNT_URL        (account URL + DefaultAzureCredential)
 */
export class OrbUploadService {
  private readonly containerClient;

  constructor() {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;

    if (connStr) {
      const svc = BlobServiceClient.fromConnectionString(connStr);
      this.containerClient = svc.getContainerClient(CONTAINER_NAME);
    } else if (accountUrl) {
      const svc = new BlobServiceClient(accountUrl, new DefaultAzureCredential());
      this.containerClient = svc.getContainerClient(CONTAINER_NAME);
    } else {
      throw new Error(
        "OrbUploadService: set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL",
      );
    }
  }

  /**
   * Uploads every image in `imageMap`, writes index.json, and returns the
   * completed SnapshotIndex.
   *
   * @param imageMap  symbol → JPEG buffer
   * @param prefix    folder name prefix, e.g. "945AM" or "orbAgent"
   */
  async uploadSnapshots(
    imageMap: Map<string, Buffer>,
    prefix: string,
  ): Promise<SnapshotIndex> {
    const folderTimestamp = this.buildFolderTimestamp(prefix);
    const createdUtc = new Date().toISOString();
    const entries: SnapshotEntry[] = [];

    // Upload images (sequentially to avoid overwhelming the storage endpoint)
    for (const [symbol, imageBuffer] of imageMap) {
      const fileName = `${sanitizeSymbol(symbol)}.jpg`;
      const blobPath = `${SNAPSHOT_FOLDER}/${folderTimestamp}/${fileName}`;
      const blob = this.containerClient.getBlockBlobClient(blobPath);

      await blob.uploadData(imageBuffer, {
        blobHTTPHeaders: { blobContentType: "image/jpeg" },
      });

      entries.push({
        symbol,
        fileName,
        path: blobPath,
        createdUtc,
        sizeBytes: imageBuffer.length,
      });

      console.log(`[OrbUpload] Uploaded ${symbol} → ${blobPath} (${imageBuffer.length} bytes)`);
    }

    // Write index.json
    const index: SnapshotIndex = {
      folderTimestamp,
      createdUtc,
      count: entries.length,
      entries,
    };

    const indexPath = `${SNAPSHOT_FOLDER}/${folderTimestamp}/index.json`;
    const indexBlob = this.containerClient.getBlockBlobClient(indexPath);
    await indexBlob.uploadData(Buffer.from(JSON.stringify(index, null, 2), "utf-8"), {
      blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
    });

    console.log(`[OrbUpload] index.json → ${indexPath} (${entries.length} entries)`);
    return index;
  }

  /** Builds a timestamp-based folder name: e.g. "945AM_20260313134500" */
  private buildFolderTimestamp(prefix: string): string {
    const now = new Date();
    const pad = (n: number, d = 2) => String(n).padStart(d, "0");
    const ts =
      `${now.getUTCFullYear()}` +
      `${pad(now.getUTCMonth() + 1)}` +
      `${pad(now.getUTCDate())}` +
      `${pad(now.getUTCHours())}` +
      `${pad(now.getUTCMinutes())}` +
      `${pad(now.getUTCSeconds())}`;
    return `${prefix}_${ts}`;
  }
}

function sanitizeSymbol(symbol: string): string {
  return symbol.replace(/[/\\:*?"<>|]/g, "_");
}

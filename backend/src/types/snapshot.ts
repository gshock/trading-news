export interface SnapshotEntry {
  symbol: string;
  fileName: string;
  path: string;
  createdUtc: string;
  sizeBytes: number;
}

export interface SnapshotIndex {
  folderTimestamp: string;
  createdUtc: string;
  count: number;
  entries: SnapshotEntry[];
}
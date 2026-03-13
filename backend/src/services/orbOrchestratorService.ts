import { OrbAgent, ORB_SYMBOLS } from "../agents/orbAgent.js";
import { ForexFactoryAgent } from "../agents/forexFactoryAgent.js";
import { renderOrbCharts } from "./orbChartRenderer.js";
import { OrbUploadService } from "./orbUploadService.js";
import { TableStorageService } from "./tableStorageService.js";
import { EmailService } from "./emailService.js";
import { FoundryService } from "./foundryService.js";
import type { AgentResult, OrbData } from "../agents/types.js";
import type { SnapshotIndex } from "../types/snapshot.js";

/**
 * "945AM"   → folder prefix `945AM_…`    (9:46 AM cron, one candle complete)
 * "orbAgent" → folder prefix `orbAgent_…` (10:01 AM cron, both candles complete)
 */
export type OrbRunType = "945AM" | "orbAgent";

const EMAIL_TITLES: Record<OrbRunType, string> = {
  "945AM": "ORB Preview — 9:45 AM",
  orbAgent: "Opening Range Bias — 10:00 AM",
};

/** Topic tag stored in Table Storage that gates delivery for each run type */
const TOPIC_FILTER: Record<OrbRunType, string> = {
  "945AM": "945AM",
  orbAgent: "10AM",
};

/** Milliseconds between the start of each TradingView WebSocket connection.
 *  Staggering prevents simultaneous connection bursts that trigger HTTP 429. */
const FETCH_STAGGER_MS = 400;

export class OrbOrchestratorService {
  private orbAgent: OrbAgent;
  private uploadService: OrbUploadService;
  private tableStorageService: TableStorageService;
  private emailService: EmailService;
  private forexAgent: ForexFactoryAgent;
  private foundryService: FoundryService;

  constructor() {
    this.orbAgent = new OrbAgent();
    this.forexAgent = new ForexFactoryAgent();
    this.uploadService = new OrbUploadService();
    this.tableStorageService = new TableStorageService();
    this.emailService = new EmailService();
    this.foundryService = new FoundryService();
  }

  /**
   * Runs the full ORB pipeline:
   *   1. Fetch 15-min candle data for all 10 sector ETFs (parallel)
   *   2. Render ORB chart images via headless Chromium
   *   3. Upload images + index.json to Azure Blob Storage
   *   4. Send the trading-update email to all active subscribers
   *
   * @returns The completed SnapshotIndex (folder + entries)
   */
  async run(runType: OrbRunType): Promise<SnapshotIndex> {
    console.log(`[OrbOrchestrator] Starting ${runType} run…`);
    const startTime = Date.now();

    // ── 1. Collect ORB data + today's economic events in parallel ─────────────
    const [allResults, forexResult] = await Promise.all([
      this.collectAll(ORB_SYMBOLS),
      this.forexAgent.collect(),
    ]);

    type SuccessResult = AgentResult<OrbData> & { data: OrbData };
    const successful = allResults.filter(
      (r): r is SuccessResult => r.success && r.data !== null,
    );
    const failed = allResults.filter((r) => !r.success);

    console.log(
      `[OrbOrchestrator] Agents done in ${Date.now() - startTime}ms` +
        ` | OK: ${successful.length}/${ORB_SYMBOLS.length}` +
        (failed.length ? ` | FAILED: ${failed.map((r) => r.error ?? "?").join("; ")}` : "") +
        ` | Forex: ${forexResult.success ? `${forexResult.data?.length ?? 0} events` : "FAILED"}`,
    );

    if (successful.length === 0) {
      throw new Error("OrbOrchestrator: all symbols failed — nothing to render");
    }

    // ── 2. Render images + AI analysis in parallel ───────────────────────────
    console.log(`[OrbOrchestrator] Rendering ${successful.length} ORB charts + generating AI analysis…`);
    const [imageMap, analysis] = await Promise.all([
      renderOrbCharts(successful.map((r) => r.data)),
      this.foundryService
        .analyzeOrbData(successful.map((r) => r.data), forexResult, runType)
        .catch((err: unknown) => {
          console.error("[OrbOrchestrator] AI analysis failed (non-fatal):", err instanceof Error ? err.message : err);
          return null;
        }),
    ]);
    console.log(`[OrbOrchestrator] ${imageMap.size} images rendered | AI analysis: ${analysis ? "OK" : "unavailable"}`);

    // ── 3. Upload to blob storage ─────────────────────────────────────────────
    console.log("[OrbOrchestrator] Uploading to blob storage…");
    const snapshotIndex = await this.uploadService.uploadSnapshots(imageMap, runType);

    // ── 4. Email subscribers opted into this topic ───────────────────────────
    try {
      const topic = TOPIC_FILTER[runType];
      const subscribers = await this.tableStorageService.listSubscriptionsByTopic(topic);
      const recipients = subscribers.map((s) => s.rowKey);

      if (recipients.length > 0) {
        const title = EMAIL_TITLES[runType];
        await this.emailService.sendTradingUpdate(snapshotIndex, recipients, title, forexResult, analysis);
        console.log(`[OrbOrchestrator] Email sent to ${recipients.length} subscriber(s) (topic: ${topic})`);
      } else {
        console.log(`[OrbOrchestrator] No subscribers for topic "${topic}" — skipping email`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[OrbOrchestrator] Email failed:", msg);
      // Non-fatal: images are already uploaded; log and continue
    }

    console.log(
      `[OrbOrchestrator] ${runType} complete in ${Date.now() - startTime}ms` +
        ` | folder: ${snapshotIndex.folderTimestamp}`,
    );
    return snapshotIndex;
  }

  /**
   * Preview run using the previous trading session's candles.
   * Renders and uploads under prefix "orbPreview_…", then emails `testEmail`
   * if provided (bypasses the subscriber list).
   */
  async runPreview(testEmail?: string): Promise<SnapshotIndex> {
    const prevDate = this.getPreviousTradingDay();
    const startTime = Date.now();
    console.log(`[OrbOrchestrator] Preview run for session: ${prevDate}`);

    // ── 1. Collect previous session data + today's economic events in parallel ─
    const [allResults, forexResult] = await Promise.all([
      this.collectAll(ORB_SYMBOLS, prevDate),
      this.forexAgent.collect(),
    ]);

    type SuccessResult = AgentResult<OrbData> & { data: OrbData };
    const successful = allResults.filter(
      (r): r is SuccessResult => r.success && r.data !== null,
    );
    const failed = allResults.filter((r) => !r.success);

    console.log(
      `[OrbOrchestrator] Preview agents done in ${Date.now() - startTime}ms` +
        ` | OK: ${successful.length}/${ORB_SYMBOLS.length}` +
        (failed.length ? ` | FAILED: ${failed.map((r) => r.error ?? "?").join("; ")}` : "") +
        ` | Forex: ${forexResult.success ? `${forexResult.data?.length ?? 0} events` : "FAILED"}`,
    );

    if (successful.length === 0) {
      throw new Error("OrbOrchestrator preview: all symbols failed — nothing to render");
    }

    // ── 2. Render images + AI analysis in parallel ────────────────────────────
    console.log(`[OrbOrchestrator] Preview rendering ${successful.length} ORB charts + generating AI analysis…`);
    const [imageMap, analysis] = await Promise.all([
      renderOrbCharts(successful.map((r) => r.data)),
      this.foundryService
        .analyzeOrbData(successful.map((r) => r.data), forexResult, "orbAgent")
        .catch((err: unknown) => {
          console.error("[OrbOrchestrator] Preview AI analysis failed (non-fatal):", err instanceof Error ? err.message : err);
          return null;
        }),
    ]);
    console.log(`[OrbOrchestrator] Preview: ${imageMap.size} images rendered | AI analysis: ${analysis ? "OK" : "unavailable"}`);

    // ── 3. Upload to blob storage ─────────────────────────────────────────────
    console.log("[OrbOrchestrator] Preview uploading to blob storage…");
    const snapshotIndex = await this.uploadService.uploadSnapshots(imageMap, "orbPreview");

    // ── 4. Send email to testEmail only (skip subscriber list) ───────────────
    if (testEmail) {
      try {
        await this.emailService.sendTradingUpdate(
          snapshotIndex,
          [testEmail],
          "ORB Preview",
          forexResult,
          analysis,
        );
        console.log(`[OrbOrchestrator] Preview email sent to ${testEmail}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[OrbOrchestrator] Preview email failed:", msg);
      }
    } else {
      console.log("[OrbOrchestrator] Preview: no test email provided — skipping email");
    }

    console.log(
      `[OrbOrchestrator] Preview complete in ${Date.now() - startTime}ms` +
        ` | folder: ${snapshotIndex.folderTimestamp}`,
    );
    return snapshotIndex;
  }

  /**
   * Starts each symbol's fetch with a FETCH_STAGGER_MS offset so we don't
   * open all 10 TradingView WebSocket connections at the exact same instant,
   * which would trigger HTTP 429 rate-limit responses.
   */
  private collectAll(
    symbols: readonly string[],
    sessionDate?: string,
  ): Promise<AgentResult<OrbData>[]> {
    return Promise.all(
      symbols.map(
        (symbol, i) =>
          new Promise<AgentResult<OrbData>>((resolve) => {
            setTimeout(
              () => resolve(this.orbAgent.collect(symbol, sessionDate)),
              i * FETCH_STAGGER_MS,
            );
          }),
      ),
    );
  }

  /** Returns the most recent weekday (Mon–Fri) before today, in ET as YYYY-MM-DD. */
  private getPreviousTradingDay(): string {
    const now = new Date();
    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const candidate = new Date(now.getTime() - daysBack * 86_400_000);
      const str = candidate.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      const [y, m, d] = str.split("-").map(Number);
      const dow = new Date(y!, m! - 1, d!).getDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) return str;
    }
    throw new Error("OrbOrchestrator: unable to determine previous trading day");
  }
}

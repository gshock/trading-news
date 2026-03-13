import { chromium, type Browser, type Page } from "playwright";
import type { EarningsEvent, AgentResult } from "./types.js";

export class EarningsAgent {
  /**
   * Builds the Finviz earnings calendar URL for today's date (in ET).
   */
  private buildUrl(): string {
    const etDateStr = new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // toLocaleDateString returns "MM/DD/YYYY" in en-US
    const [mm, dd, yyyy] = etDateStr.split("/");
    return `https://finviz.com/calendar/earnings?dateFrom=${yyyy}-${mm}-${dd}`;
  }

  async collect(): Promise<AgentResult<EarningsEvent[]>> {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--disable-http2",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      const page = await context.newPage();

      const url = this.buildUrl();
      console.log(`[EarningsAgent] Fetching: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

      // Wait for the earnings table rows to appear
      await page
        .waitForSelector("table tr", { timeout: 15_000 })
        .catch(() => {});

      // Extra wait for JS-rendered content
      await page.waitForTimeout(3_000);

      const events = await this.parseEarningsTable(page);

      await browser.close();

      return {
        agentName: "EarningsAgent",
        success: true,
        data: events,
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      await browser?.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EarningsAgent] Error:", message);
      return {
        agentName: "EarningsAgent",
        success: false,
        data: null,
        error: message,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Parses the Finviz earnings calendar table.
   * Uses the Playwright Node.js locator API only — no page.evaluate() —
   * to avoid the tsx/esbuild __name injection bug in browser sandboxes.
   *
   * Finviz table columns (detected dynamically from headers):
   *   #, Ticker, Company, Market Cap, FY End, EPS Estimate, EPS (1Y Ago),
   *   Revenue Estimate, Revenue (1Y Ago), When
   */
  private async parseEarningsTable(page: Page): Promise<EarningsEvent[]> {
    const events: EarningsEvent[] = [];
    const tables = page.locator("table");
    const tableCount = await tables.count();

    for (let t = 0; t < tableCount; t++) {
      const table = tables.nth(t);
      const rows = table.locator("tr");
      const rowCount = await rows.count();
      if (rowCount < 2) continue;

      // Read each header cell individually — avoids tab/newline split ambiguity
      const headerCells = rows.nth(0).locator("th, td");
      const headerCount = await headerCells.count();
      const headers: string[] = [];
      for (let h = 0; h < headerCount; h++) {
        const text = await headerCells.nth(h).innerText().catch(() => "");
        headers.push(text.trim().toLowerCase());
      }

      // Only process tables that expose a Ticker/Symbol column
      const hasTickerCol = headers.some((h) => h.includes("ticker") || h.includes("symbol"));
      if (!hasTickerCol) continue;

      // Map column keywords → index
      const findCol = (...terms: string[]): number =>
        headers.findIndex((h) => terms.some((term) => h.includes(term)));

      const tickerIdx  = findCol("ticker", "symbol");
      const companyIdx = findCol("company", "name");
      const capIdx     = findCol("market cap", "mkt cap");
      const epsIdx     = findCol("eps estimate", "eps est");
      // Finviz uses "Revenue Est" — avoid matching "Revenue (1Y Ago)" by requiring "est"
      const revIdx     = headers.findIndex((h) => h.includes("revenue") && h.includes("est"));
      const whenIdx    = findCol("when", "time", "session", "report time");

      console.log("[EarningsAgent] Detected headers:", headers);
      console.log("[EarningsAgent] Col indices — ticker:", tickerIdx, "company:", companyIdx,
        "cap:", capIdx, "eps:", epsIdx, "rev:", revIdx, "when:", whenIdx);

      // Parse data rows (skip header at index 0)
      for (let i = 1; i < rowCount; i++) {
        // Read each data cell individually for the same reason
        const dataCells = rows.nth(i).locator("td");
        const cellCount = await dataCells.count();
        if (cellCount === 0) continue;

        const cells: string[] = [];
        for (let c = 0; c < cellCount; c++) {
          const text = await dataCells.nth(c).innerText().catch(() => "");
          cells.push(text.trim());
        }

        const ticker = tickerIdx >= 0 ? (cells[tickerIdx] ?? "") : (cells[1] ?? "");
        // Validate: 1–6 uppercase letters, optional dot + 1–2 letters (e.g. BRK.B)
        if (!ticker || !/^[A-Z]{1,6}(\.?[A-Z]{0,2})?$/.test(ticker)) continue;

        const whenText = whenIdx >= 0 ? (cells[whenIdx] ?? "") : "";

        events.push({
          ticker,
          company:          companyIdx >= 0 ? (cells[companyIdx] ?? "") : "",
          reportTime:       this.parseReportTime(whenText),
          marketCap:        capIdx     >= 0 ? (cells[capIdx]     ?? "") : "",
          epsEstimate:      epsIdx     >= 0 ? (cells[epsIdx]     ?? "") : "",
          revenueEstimate:  revIdx     >= 0 ? (cells[revIdx]     ?? "") : "",
        });
      }

      if (events.length > 0) break; // Found the earnings table; stop scanning
    }

    return events;
  }

  private parseReportTime(text: string): EarningsEvent["reportTime"] {
    const upper = text.toUpperCase();
    if (
      upper.includes("BMO") ||
      upper.includes("BEFORE OPEN") ||
      upper.includes("BEFORE MARKET") ||
      upper.includes("PRE-MARKET")
    ) {
      return "BMO";
    }
    if (
      upper.includes("AMC") ||
      upper.includes("AFTER CLOSE") ||
      upper.includes("AFTER MARKET") ||
      upper.includes("POST-MARKET")
    ) {
      return "AMC";
    }
    if (
      upper.includes("DURING") ||
      upper.includes("INTRADAY") ||
      upper.includes("TRADING HOURS") ||
      upper.includes("MARKET HOURS")
    ) {
      return "During Market";
    }
    return "Unknown";
  }
}

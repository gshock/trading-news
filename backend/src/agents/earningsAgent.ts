import { chromium, type Browser, type Page } from "playwright";
import type { EarningsEvent, AgentResult } from "./types.js";

export class EarningsAgent {
  private readonly url = "https://marketchameleon.com/Calendar/Earnings";

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

      await page.goto(this.url, { waitUntil: "domcontentloaded", timeout: 45_000 });

      // Wait for the earnings table rows to appear
      await page
        .waitForSelector("table tr", { timeout: 15_000 })
        .catch(() => {});

      // Extra wait for JS-rendered content
      await page.waitForTimeout(2_500);

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
   * Uses the Playwright Node.js locator API exclusively — no page.evaluate() —
   * to avoid the tsx/esbuild __name injection bug in browser sandboxes.
   */
  private async parseEarningsTable(page: Page): Promise<EarningsEvent[]> {
    // Grab table rows; each row's innerText gives us tab/newline-delimited cells
    const rows = page.locator("table tr");
    const rowCount = await rows.count();

    const events: EarningsEvent[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const rowText = await row.innerText().catch(() => "");
      if (!rowText.trim()) continue;

      // Split on tabs or multiple spaces to get individual cell values
      const cells = rowText
        .split(/\t|\n/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Skip header rows (don't start with a ticker-like token)
      if (!cells[0] || !/^[A-Z]{1,5}$/.test(cells[0])) continue;

      const ticker = cells[0] ?? "";

      // Determine report time from the row text
      const upperText = rowText.toUpperCase();
      let reportTime: EarningsEvent["reportTime"] = "Unknown";
      if (upperText.includes("BMO") || upperText.includes("BEFORE MARKET")) {
        reportTime = "BMO";
      } else if (
        upperText.includes("AMC") ||
        upperText.includes("AFTER MARKET") ||
        upperText.includes("AFTER CLOSE")
      ) {
        reportTime = "AMC";
      } else if (upperText.includes("DURING MARKET")) {
        reportTime = "During Market";
      }

      // Extract percentage values (e.g. "±3.5%", "4.2%", "-2.1%")
      const percentages = rowText.match(/[±±\-+]?\d+\.?\d*%/g) ?? [];

      // Extract market cap if present (e.g. "12.5B", "450M")
      const marketCapMatch = /(\d+\.?\d*\s*[BbMmTt])\b/.exec(rowText);

      // Company name: typically the second cell after ticker, before time-of-day tokens
      // We extract it by looking for cells[1] that don't look like a number/percentage/date
      const companyName = this.extractCompanyName(cells, ticker);

      events.push({
        ticker,
        company: companyName,
        reportTime,
        expectedMove: percentages[0] ?? "",
        impliedMove: percentages[1] ?? "",
        historicalMove: percentages[2] ?? "",
        marketCap: marketCapMatch ? marketCapMatch[1]! : "",
      });
    }

    return events;
  }

  private extractCompanyName(cells: string[], ticker: string): string {
    // Skip the ticker cell itself; find the first cell that looks like a company name
    // (not purely numeric, not a percentage, not a short date, not BMO/AMC)
    const skipPatterns = /^(\d|\+|-|±|%|BMO|AMC|N\/A|--)/i;
    for (const cell of cells) {
      if (cell === ticker) continue;
      if (skipPatterns.test(cell)) continue;
      if (/^\d{1,2}[\/\-]\d{1,2}/.test(cell)) continue; // date-like
      if (cell.length < 2) continue;
      return cell;
    }
    return "";
  }
}

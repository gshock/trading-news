import { chromium, type Browser, type Page } from "playwright";
import type { FearGreedData, AgentResult } from "./types.js";

export class FearGreedAgent {
  private readonly url = "https://www.cnn.com/markets/fear-and-greed";

  async collect(): Promise<AgentResult<FearGreedData>> {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();

      await page.goto(this.url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Give the React app time to render the gauge before reading the DOM.
      // Using waitForTimeout (Node.js side) avoids any browser-side eval serialization issues.
      await page.waitForTimeout(4_000);

      // All extraction below uses Playwright's Node.js locator API — no page.evaluate() calls,
      // which avoids the tsx/esbuild __name helper injection bug.
      const score = await this.extractScore(page);

      // Grab the full visible text of the page for regex-based historical parsing
      const bodyText = await page.locator("body").innerText().catch(() => "");

      const label = this.extractLabel(bodyText, score);
      const historical = this.parseHistorical(bodyText);

      await browser.close();

      return {
        agentName: "FearGreedAgent",
        success: true,
        data: {
          score,
          label,
          previousClose: historical.previousClose,
          oneWeekAgo: historical.oneWeekAgo,
          oneMonthAgo: historical.oneMonthAgo,
          oneYearAgo: historical.oneYearAgo,
          timestamp: new Date().toISOString(),
        },
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      await browser?.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[FearGreedAgent] Error:", message);
      return {
        agentName: "FearGreedAgent",
        success: false,
        data: null,
        error: message,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Tries a series of CSS selectors for the score via the Node.js locator API.
   * Falls back to regex parsing of the page's inner text.
   */
  private async extractScore(page: Page): Promise<number> {
    const selectors = [
      "[class*='dial-number']",
      "[class*='fng-gauge__dial-number']",
      "[class*='market-fng-gauge__dial-number']",
      "[class*='gauge'] strong",
      "[class*='fng'] [class*='number']",
    ];

    for (const selector of selectors) {
      const text = await page
        .locator(selector)
        .first()
        .textContent({ timeout: 3_000 })
        .catch(() => null);
      if (text) {
        const num = parseInt(text.trim(), 10);
        if (!isNaN(num) && num >= 0 && num <= 100) return num;
      }
    }

    // Last resort: look for a standalone 1-3 digit number adjacent to a sentiment label
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const match =
      /(?:Extreme Fear|Extreme Greed|Fear|Greed|Neutral)\s*[\n\r]+\s*(\d{1,3})/i.exec(
        bodyText,
      ) ??
      /(\d{1,3})\s*[\n\r]+\s*(?:Extreme Fear|Extreme Greed|Fear|Greed|Neutral)/i.exec(
        bodyText,
      );
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num >= 0 && num <= 100) return num;
    }

    return 0;
  }

  private extractLabel(bodyText: string, score: number): string {
    const match =
      /(Extreme Fear|Extreme Greed|Fear|Greed|Neutral)/i.exec(bodyText);
    if (match) {
      const raw = match[1]!;
      return raw
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
    return this.scoreToLabel(score);
  }

  private scoreToLabel(score: number): string {
    if (score <= 25) return "Extreme Fear";
    if (score <= 45) return "Fear";
    if (score <= 55) return "Neutral";
    if (score <= 75) return "Greed";
    return "Extreme Greed";
  }

  private parseHistorical(text: string): {
    previousClose: { score: number; label: string };
    oneWeekAgo: { score: number; label: string };
    oneMonthAgo: { score: number; label: string };
    oneYearAgo: { score: number; label: string };
  } {
    const extract = (pattern: RegExp): { score: number; label: string } => {
      const match = pattern.exec(text);
      if (!match) return { score: 0, label: "Unknown" };
      const num = parseInt(match[1]!, 10);
      return { score: num, label: this.scoreToLabel(num) };
    };

    return {
      previousClose: extract(
        /[Pp]revious\s+[Cc]lose[\s\S]{0,80}?(\d{1,3})/,
      ),
      oneWeekAgo: extract(/1\s+[Ww]eek\s+[Aa]go[\s\S]{0,80}?(\d{1,3})/),
      oneMonthAgo: extract(/1\s+[Mm]onth\s+[Aa]go[\s\S]{0,80}?(\d{1,3})/),
      oneYearAgo: extract(/1\s+[Yy]ear\s+[Aa]go[\s\S]{0,80}?(\d{1,3})/),
    };
  }
}

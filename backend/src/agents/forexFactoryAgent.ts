import { chromium, type Browser } from "playwright";
import type { ForexEvent, AgentResult } from "./types.js";

export class ForexFactoryAgent {
  async collect(): Promise<AgentResult<ForexEvent[]>> {
    let browser: Browser | undefined;
    try {
      // Build the single-day URL for today in Eastern Time.
      // ForexFactory accepts ?day=mar13.2026 — pointing directly to one day
      // avoids any DOM date-parsing and is immune to weekly-view layout changes.
      const now = new Date();
      const etFmt = (opts: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "America/New_York" }).format(now);
      const month = etFmt({ month: "short" }).toLowerCase(); // "mar"
      const day   = etFmt({ day: "numeric" });               // "13"
      const year  = etFmt({ year: "numeric" });              // "2026"
      const url   = `https://www.forexfactory.com/calendar?day=${month}${day}.${year}`;

      console.log(`[ForexFactoryAgent] Fetching ${url}`);

      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        timezoneId: "America/New_York",
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Wait for the calendar table to render
      await page.waitForSelector(".calendar__table", { timeout: 15_000 });

      // The single-day view contains only today's events — no date filtering needed.
      const events = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".calendar__row"));
        const results: {
          time: string;
          currency: string;
          impact: string;
          event: string;
          actual: string;
          forecast: string;
          previous: string;
        }[] = [];

        let currentTime = "";

        for (const row of rows) {
          const timeCell = row.querySelector(".calendar__time");
          const currencyCell = row.querySelector(".calendar__currency");
          const impactCell = row.querySelector(".calendar__impact span");
          const eventCell = row.querySelector(".calendar__event-title");
          const actualCell = row.querySelector(".calendar__actual");
          const forecastCell = row.querySelector(".calendar__forecast");
          const previousCell = row.querySelector(".calendar__previous");

          if (timeCell?.textContent?.trim()) {
            currentTime = timeCell.textContent.trim();
          }

          const currency = currencyCell?.textContent?.trim() ?? "";
          const eventName = eventCell?.textContent?.trim() ?? "";

          if (!currency || !eventName) continue;

          // High impact has the red icon (class contains "high")
          const impactClasses = impactCell?.className ?? "";
          const isHighImpact =
            impactClasses.includes("high") ||
            impactClasses.includes("icon--ff-impact-red");

          // Filter: USD currency and high impact only
          if (currency !== "USD" || !isHighImpact) continue;

          results.push({
            time: currentTime,
            currency,
            impact: "high",
            event: eventName,
            actual: actualCell?.textContent?.trim() ?? "",
            forecast: forecastCell?.textContent?.trim() ?? "",
            previous: previousCell?.textContent?.trim() ?? "",
          });
        }

        return results;
      });

      const typedEvents: ForexEvent[] = events.map((e: { time: string; currency: string; impact: string; event: string; actual: string; forecast: string; previous: string }) => ({
        ...e,
        impact: "high" as const,
      }));

      await browser.close();

      return {
        agentName: "ForexFactoryAgent",
        success: true,
        data: typedEvents,
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      await browser?.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[ForexFactoryAgent] Error:", message);
      return {
        agentName: "ForexFactoryAgent",
        success: false,
        data: null,
        error: message,
        collectedAt: new Date().toISOString(),
      };
    }
  }
}

import type {
  PreMarketBriefing,
  ForexEvent,
  FearGreedData,
  EarningsEvent,
  SpyChartData,
  AgentResult,
} from "../agents/types.js";
import { formatLongDate, formatSentAt } from "../utils/formatDate.js";

export class PreMarketBriefingTemplate {
  render(briefing: PreMarketBriefing, unsubscribeUrl?: string): string {
    const date = formatLongDate(briefing.generatedAt);
    const sentAt = formatSentAt();

    const fearGreedSection = this.buildFearGreedSection(briefing.fearGreed);
    const spyChartSection = this.buildSpyChartSection(briefing.spyChart, briefing.spyChartImage);
    const forexSection = this.buildForexSection(briefing.forexEvents);
    const earningsSection = this.buildEarningsSection(briefing.earnings);
    const analysisSection = this.buildAnalysisSection(briefing.analysis);

    const footerLinks = unsubscribeUrl
      ? `<br><a href="${unsubscribeUrl}" style="color:#3b82f6;text-decoration:underline;">Unsubscribe</a>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pre-Market Briefing — ${date}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">

        <!-- Card -->
        <table width="620" cellpadding="0" cellspacing="0" border="0"
          style="max-width:620px;width:100%;background-color:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- TOP ACCENT BAR -->
          <tr>
            <td style="background-color:#1e40af;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1e3a8a;padding:28px 32px 24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#93c5fd;text-transform:uppercase;">Pre-Market Briefing</p>
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">${date}</h1>
              <p style="margin:0;font-size:12px;color:#93c5fd;">Generated ${sentAt} ET</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:28px 32px;">

              ${fearGreedSection}
              ${spyChartSection}
              ${forexSection}
              ${earningsSection}
              ${analysisSection}

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-top:24px;border-top:1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top:16px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
                    Data sourced from ForexFactory, CNN Markets, and Finviz.<br>
                    This briefing is for informational purposes only and does not constitute financial advice.
                    ${footerLinks}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- BOTTOM ACCENT BAR -->
          <tr>
            <td style="background-color:#1e40af;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  // ─── Section builders ───────────────────────────────────────────────────────

  private buildFearGreedSection(result: AgentResult<FearGreedData>): string {
    const title = this.sectionTitle("Market Sentiment — Fear &amp; Greed Index");

    if (!result.success || !result.data) {
      return title + this.stateRow(result.error ?? "Data unavailable.", "error");
    }

    const d = result.data;
    const color = this.fearGreedColor(d.score);

    const historical: { label: string; score: number; sentiment: string }[] = [
      { label: "Previous Close", score: d.previousClose.score, sentiment: d.previousClose.label },
      { label: "1 Week Ago", score: d.oneWeekAgo.score, sentiment: d.oneWeekAgo.label },
      { label: "1 Month Ago", score: d.oneMonthAgo.score, sentiment: d.oneMonthAgo.label },
      { label: "1 Year Ago", score: d.oneYearAgo.score, sentiment: d.oneYearAgo.label },
    ];

    const histRows = historical
      .map(
        (h, i) => `
      <tr style="background-color:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
        <td style="padding:7px 12px;font-size:12px;color:#64748b;">${h.label}</td>
        <td style="padding:7px 12px;font-size:12px;font-weight:600;color:#1e293b;text-align:right;">
          ${h.score}
          <span style="font-weight:400;color:${this.fearGreedColor(h.score)};">(${h.sentiment})</span>
        </td>
      </tr>`,
      )
      .join("");

    return `
    ${title}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td width="100" style="vertical-align:top;padding-right:16px;">
          <table cellpadding="0" cellspacing="0" border="0"
            style="width:100px;background-color:${color};border-radius:8px;text-align:center;">
            <tr><td style="padding:14px 8px 4px;">
              <span style="font-size:38px;font-weight:700;color:#ffffff;line-height:1;">${d.score}</span>
            </td></tr>
            <tr><td style="padding:0 8px 14px;">
              <span style="font-size:10px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;">${d.label}</span>
            </td></tr>
          </table>
        </td>
        <td style="vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            ${histRows}
          </table>
        </td>
      </tr>
    </table>`;
  }

  private buildSpyChartSection(result: AgentResult<SpyChartData>, chartImage: Buffer | null): string {
    const title = this.sectionTitle("SPY Weekly — Price vs 20 SMA");

    if (!result.success || !result.data) {
      return title + this.stateRow(result.error ?? "SPY chart data unavailable.", "error");
    }

    const d = result.data;
    const posColor = d.position === "above" ? "#16a34a" : d.position === "below" ? "#dc2626" : "#ca8a04";
    const posLabel = d.position === "above" ? "ABOVE" : d.position === "below" ? "BELOW" : "AT";
    const arrow = d.position === "above" ? "&#9650;" : d.position === "below" ? "&#9660;" : "&#9679;";

    const chartRow = chartImage
      ? `<tr>
          <td style="padding:0 0 12px;">
            <img src="cid:spy-chart" alt="SPY Weekly vs 20 SMA" width="700" style="max-width:100%;height:auto;border-radius:6px;border:1px solid #e2e8f0;" />
          </td>
        </tr>`
      : "";

    return `
    ${title}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${chartRow}
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <tr style="background-color:#f8fafc;">
              <td style="padding:10px 14px;font-size:12px;color:#64748b;">Current Price</td>
              <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#1e293b;text-align:right;">$${d.latestClose.toFixed(2)}</td>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;">20-Week SMA</td>
              <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#1e293b;text-align:right;">$${d.latestSma.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;">Last Weekly Close</td>
              <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#475569;text-align:left;">$${d.latestWeeklyClose.toFixed(2)}</td>
              <td colspan="2" style="padding:10px 14px;font-size:13px;font-weight:700;color:${posColor};text-align:right;">
                ${arrow} ${posLabel} by $${Math.abs(d.priceVsSma).toFixed(2)} (${d.priceVsSmaPct > 0 ? "+" : ""}${d.priceVsSmaPct.toFixed(2)}%)
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private buildForexSection(result: AgentResult<ForexEvent[]>): string {
    const title = this.sectionTitle("High-Impact USD Economic Events");

    if (!result.success || !result.data?.length) {
      return (
        title +
        this.stateRow(result.error ?? "No high-impact USD events scheduled today.", "empty")
      );
    }

    const rows = result.data
      .map(
        (e, i) => `
      <tr style="background-color:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
        <td style="padding:8px 10px;font-size:12px;color:#64748b;white-space:nowrap;">${e.time}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:600;color:#1e293b;">${e.event}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;text-align:right;">${e.forecast || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;text-align:right;">${e.previous || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:${e.actual ? "600" : "400"};color:${e.actual ? "#1e293b" : "#cbd5e1"};text-align:right;">${e.actual || "—"}</td>
      </tr>`,
      )
      .join("");

    return `
    ${title}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#1e3a8a;">
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;">TIME</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;">EVENT</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">FORECAST</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">PREVIOUS</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">ACTUAL</th>
      </tr>
      ${rows}
    </table>`;
  }

  private buildEarningsSection(result: AgentResult<EarningsEvent[]>): string {
    const title = this.sectionTitle("Upcoming Earnings Reports");

    if (!result.success || !result.data?.length) {
      return (
        title + this.stateRow(result.error ?? "No earnings reports scheduled today.", "empty")
      );
    }

    const midCap = result.data.filter((e) => this.parseMarketCapBillions(e.marketCap) >= 2);

    if (!midCap.length) {
      return title + this.stateRow("No mid-cap or larger earnings reports scheduled today.", "empty");
    }

    // Sort: BMO first, then During Market, then AMC, then Unknown
    const order: Record<string, number> = { BMO: 0, "During Market": 1, AMC: 2, Unknown: 3 };
    const sorted = [...midCap].sort(
      (a, b) => (order[a.reportTime] ?? 3) - (order[b.reportTime] ?? 3),
    );

    const rows = sorted
      .map(
        (e, i) => `
        <tr style="background-color:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
          <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#1e293b;">${e.ticker}</td>
          <td style="padding:7px 10px;font-size:12px;color:#475569;">${e.company || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:center;">${this.abbreviateReportTime(e.reportTime)}</td>
          <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;">${e.marketCap || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;">${e.epsEstimate || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;">${e.revenueEstimate || "—"}</td>
        </tr>`,
      )
      .join("");

    return `
    ${title}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tr style="background-color:#1e3a8a;">
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;">TICKER</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;">COMPANY</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:center;letter-spacing:0.5px;">TIME</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">MKT CAP</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">EPS EST</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;">REV EST</th>
      </tr>
      ${rows}
    </table>`;
  }

  private buildAnalysisSection(analysis: string | null): string {
    const title = this.sectionTitle("AI Trading Analysis");

    if (!analysis) {
      return title + this.stateRow("Analysis not available.", "empty");
    }

    return `
    ${title}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:20px;">
          <div style="font-size:13px;line-height:1.7;color:#1e293b;">
            ${this.markdownToHtml(analysis)}
          </div>
        </td>
      </tr>
    </table>`;
  }

  // ─── Markdown → HTML (email-safe) ──────────────────────────────────────────

  private markdownToHtml(text: string): string {
    const lines = text.split("\n");
    const out: string[] = [];
    let inList = false;

    for (const raw of lines) {
      const escaped = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Heading: ## or ###
      if (/^#{1,3}\s/.test(raw)) {
        if (inList) { out.push("</ul>"); inList = false; }
        const heading = escaped
          .replace(/^#{1,3}\s/, "")
          .replace(/\*\*(.+?)\*\*/g, "$1");
        out.push(
          `<p style="margin:16px 0 6px;font-size:13px;font-weight:700;color:#1e40af;` +
          `border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${heading}</p>`,
        );
        continue;
      }

      // List item: - or *
      if (/^[-*]\s/.test(raw)) {
        if (!inList) {
          out.push('<ul style="margin:4px 0 8px;padding-left:20px;">');
          inList = true;
        }
        const item = escaped
          .replace(/^[-*]\s/, "")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        out.push(`<li style="margin-bottom:4px;">${item}</li>`);
        continue;
      }

      // Blank line
      if (!raw.trim()) {
        if (inList) { out.push("</ul>"); inList = false; }
        continue;
      }

      // Regular paragraph
      if (inList) { out.push("</ul>"); inList = false; }
      const para = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      out.push(`<p style="margin:0 0 8px;">${para}</p>`);
    }

    if (inList) out.push("</ul>");
    return out.join("\n");
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private fearGreedColor(score: number): string {
    if (score <= 25) return "#dc2626"; // Extreme Fear
    if (score <= 45) return "#ea580c"; // Fear
    if (score <= 55) return "#ca8a04"; // Neutral
    if (score <= 75) return "#16a34a"; // Greed
    return "#15803d"; // Extreme Greed
  }

  private sectionTitle(text: string): string {
    return `<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#1e3a8a;` +
      `text-transform:uppercase;letter-spacing:0.8px;border-left:3px solid #1e40af;` +
      `padding-left:10px;">${text}</p>`;
  }

  private stateRow(msg: string, type: "empty" | "error"): string {
    const color = type === "error" ? "#ef4444" : "#94a3b8";
    return `<p style="margin:0 0 24px;font-size:12px;color:${color};font-style:italic;">${msg}</p>`;
  }

  private abbreviateReportTime(reportTime: EarningsEvent["reportTime"]): string {
    switch (reportTime) {
      case "BMO": return "BMO";
      case "AMC": return "AMC";
      case "During Market": return "DMH";
      default: return "—";
    }
  }

  /** Parses Finviz market cap strings like "$2.57B", "$831.78M", "$3.49B" into billions. */
  private parseMarketCapBillions(raw: string): number {
    if (!raw) return -1;
    const upper = raw.toUpperCase();
    if (upper.includes("K") || upper.includes("M")) return 0; // thousands/millions — always below $2B
    if (upper.includes("T")) return 999_999;                  // trillions — always above
    const match = /\$?([\d,]+\.?\d*)\s*B/i.exec(raw);
    if (!match) return -1;
    return parseFloat(match[1]!.replace(/,/g, ""));
  }
}

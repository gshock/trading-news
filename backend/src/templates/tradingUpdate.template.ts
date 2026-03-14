import type { SnapshotEntry, SnapshotIndex } from "../types/snapshot.js";
import type { ForexEvent, AgentResult } from "../agents/types.js";
import { formatLongDate, formatTime, formatSentAt } from "../utils/formatDate.js";

export class TradingUpdateTemplate {
  private readonly COLS = 2;
  private readonly CELL_WIDTH = 280;

  private buildChartCell(entry: SnapshotEntry): string {
    const cid = `chart-${entry.symbol.toLowerCase()}`;
    return `
    <td width="${this.CELL_WIDTH + 8}" style="width:${this.CELL_WIDTH + 8}px;padding:4px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0" width="${this.CELL_WIDTH}" style="width:${this.CELL_WIDTH}px;">
        <tr>
          <td style="padding:0;line-height:0;">
            <img src="cid:${cid}" alt="${entry.symbol}" width="${this.CELL_WIDTH}" style="display:block;width:${this.CELL_WIDTH}px;height:auto;">
          </td>
        </tr>
      </table>
    </td>`;
  }

  private buildEmptyCell(): string {
    return `<td width="${this.CELL_WIDTH + 8}" style="width:${this.CELL_WIDTH + 8}px;padding:4px;"></td>`;
  }

  private buildChartGrid(entries: SnapshotEntry[]): string {
    let rows = "";

    for (let i = 0; i < entries.length; i += this.COLS) {
      const rowEntries: (SnapshotEntry | null)[] = entries.slice(i, i + this.COLS);
      while (rowEntries.length < this.COLS) rowEntries.push(null);

      const cells = rowEntries
        .map((entry) => (entry ? this.buildChartCell(entry) : this.buildEmptyCell()))
        .join("");

      rows += `<tr>${cells}</tr><tr><td colspan="${this.COLS}" style="height:4px;"></td></tr>`;
    }

    return rows;
  }

  render(snapshotData: SnapshotIndex, title: string, forexEvents?: AgentResult<ForexEvent[]>, analysis?: string | null, unsubscribeUrl?: string): string {
    const { createdUtc, entries } = snapshotData;

    const date = formatLongDate(createdUtc);
    const time = formatTime(createdUtc);
    const sentAt = formatSentAt();

    const chartGrid = this.buildChartGrid(entries);
    const symbolCount = entries.length;
    const forexSection = forexEvents ? this.buildForexSection(forexEvents) : "";
    const analysisSection = this.buildAnalysisSection(analysis ?? null);

    const footerText = unsubscribeUrl
      ? `<a href="${unsubscribeUrl}" style="color:#3b82f6;text-decoration:underline;">Unsubscribe</a>`
      : "You're receiving this as a subscriber.";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — ${date}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Georgia,'Times New Roman',serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">

        <!-- Card -->
        <table width="620" cellpadding="0" cellspacing="0" border="0"
          style="max-width:620px;width:100%;background-color:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- ── TOP ACCENT BAR ── -->
          <tr>
            <td style="background-color:#1e40af;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── MASTHEAD ── -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:bottom;">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${title}</span>
                  </td>
                  <td style="text-align:right;vertical-align:bottom;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;letter-spacing:0.3px;">${date}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:2px solid #1e40af;width:48px;max-width:48px;">&nbsp;</td>
                  <td style="border-top:1px solid #e2e8f0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── INTRO ── -->
          <tr>
            <td style="padding:18px 32px 22px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:#334155;">
                Here's your chart update for <strong style="color:#1e40af;">${time}</strong> — ${symbolCount} symbol${symbolCount !== 1 ? "s" : ""} captured in this snapshot.
              </p>
            </td>
          </tr>

          ${forexSection ? `<!-- ── ECONOMIC EVENTS ── -->
          <tr><td style="padding:0 32px 24px;">${forexSection}</td></tr>` : ""}

          ${analysisSection ? `<!-- ── AI TRADING ANALYSIS ── -->
          <tr><td style="padding:0 32px 24px;">${analysisSection}</td></tr>` : ""}

          <!-- ── CHART GRID ── -->
          <tr>
            <td style="padding:0 32px 10px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:#1e3a8a;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;border-left:3px solid #1e40af;padding-left:8px;">Sector ORBs</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                ${chartGrid}
              </table>
            </td>
          </tr>

          <!-- ── FOOTER DIVIDER ── -->
          <tr>
            <td style="padding:0 32px;">
              <div style="border-top:1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:18px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;">
                      Sent ${sentAt}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;">
                      ${footerText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BOTTOM ACCENT BAR ── -->
          <tr>
            <td style="background-color:#f8fafc;padding:12px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#cbd5e1;letter-spacing:1.5px;text-transform:uppercase;">Trading Updates</span>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  private buildForexSection(result: AgentResult<ForexEvent[]>): string {
    if (!result.success || !result.data?.length) return "";

    const rows = result.data
      .map(
        (e, i) => `
      <tr style="background-color:${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
        <td style="padding:8px 10px;font-size:12px;color:#64748b;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;">${e.time}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:600;color:#1e293b;font-family:Arial,Helvetica,sans-serif;">${e.event}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;text-align:right;font-family:Arial,Helvetica,sans-serif;">${e.forecast || "\u2014"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#475569;text-align:right;font-family:Arial,Helvetica,sans-serif;">${e.previous || "\u2014"}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:${e.actual ? "700" : "400"};color:${e.actual ? "#1e293b" : "#cbd5e1"};text-align:right;font-family:Arial,Helvetica,sans-serif;">${e.actual || "\u2014"}</td>
      </tr>`,
      )
      .join("");

    return `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;color:#1e3a8a;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;border-left:3px solid #1e40af;padding-left:8px;">High-Impact USD Economic Events</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <tr style="background-color:#1e3a8a;">
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">TIME</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:left;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">EVENT</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">FORECAST</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">PREVIOUS</th>
        <th style="padding:8px 10px;font-size:11px;color:#93c5fd;font-weight:600;text-align:right;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">ACTUAL</th>
      </tr>
      ${rows}
    </table>`;
  }

  private buildAnalysisSection(analysis: string | null): string {
    if (!analysis) return "";

    return `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;color:#1e3a8a;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;border-left:3px solid #1e40af;padding-left:8px;">AI Trading Analysis</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;">
          <div style="font-size:13px;line-height:1.7;color:#1e293b;font-family:Arial,Helvetica,sans-serif;">
            ${this.markdownToHtml(analysis)}
          </div>
        </td>
      </tr>
    </table>`;
  }

  private markdownToHtml(text: string): string {
    const lines = text.split("\n");
    const out: string[] = [];
    let inList = false;

    for (const raw of lines) {
      const escaped = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Heading: ##, ###
      if (/^#{1,3}\s/.test(raw)) {
        if (inList) { out.push("</ul>"); inList = false; }
        const heading = escaped
          .replace(/^#{1,3}\s/, "")
          .replace(/\*\*(.+?)\*\*/g, "$1");
        out.push(
          `<p style="margin:14px 0 5px;font-size:13px;font-weight:700;color:#1e40af;` +
          `border-bottom:1px solid #e2e8f0;padding-bottom:3px;">${heading}</p>`,
        );
        continue;
      }

      // List item
      if (/^[-*]\s/.test(raw)) {
        if (!inList) { out.push('<ul style="margin:6px 0;padding-left:18px;">'); inList = true; }
        const item = escaped
          .replace(/^[-*]\s/, "")
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>');
        out.push(`<li style="margin:4px 0;">${item}</li>`);
        continue;
      }

      // Blank line
      if (!escaped.trim()) {
        if (inList) { out.push("</ul>"); inList = false; }
        continue;
      }

      // Plain paragraph
      if (inList) { out.push("</ul>"); inList = false; }
      const para = escaped.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>');
      out.push(`<p style="margin:6px 0;">${para}</p>`);
    }

    if (inList) out.push("</ul>");
    return out.join("\n");
  }
}

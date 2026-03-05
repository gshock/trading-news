import type { SnapshotEntry, SnapshotIndex } from "../types/snapshot.js";
import { formatLongDate, formatTime, formatSentAt } from "../utils/formatDate.js";

export class TradingUpdateTemplate {
  private readonly COLS = 5;
  private readonly CELL_WIDTH = 108;

  private buildChartCell(entry: SnapshotEntry): string {
    const cid = `chart-${entry.symbol.toLowerCase()}`;
    return `
    <td width="${this.CELL_WIDTH + 8}" style="width:${this.CELL_WIDTH + 8}px;padding:4px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0" width="${this.CELL_WIDTH}" style="width:${this.CELL_WIDTH}px;border-radius:6px;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:0;line-height:0;">
            <img src="cid:${cid}" alt="${entry.symbol}" width="${this.CELL_WIDTH}" style="display:block;width:${this.CELL_WIDTH}px;height:auto;">
          </td>
        </tr>
        <tr>
          <td style="background:#1e40af;padding:5px 4px 6px;text-align:center;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#ffffff;letter-spacing:0.8px;">${entry.symbol}</span>
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

  render(snapshotData: SnapshotIndex): string {
    const { createdUtc, entries } = snapshotData;

    const date = formatLongDate(createdUtc);
    const time = formatTime(createdUtc);
    const sentAt = formatSentAt();

    const chartGrid = this.buildChartGrid(entries);
    const symbolCount = entries.length;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Market Snapshot — ${date}</title>
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
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Market Snapshot</span>
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

          <!-- ── CHART GRID ── -->
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
                      You're receiving this as a subscriber.
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
}

import { chromium } from "playwright";
import type { OrbData } from "../agents/types.js";

// ── SVG layout constants (matches the Razor OpeningRangeGauge component) ─────
const SVG_HEIGHT = 170;
const CANDLE_WIDTH = 18;
const CANDLE_GAP = 18;
const SLOT_WIDTH = CANDLE_WIDTH + CANDLE_GAP; // 36
const SVG_WIDTH = SLOT_WIDTH * 3; // 108
const LABEL_SLOT_WIDTH = CANDLE_WIDTH + 4; // 22
const ARROW_HEIGHT = 12;

function slotStart(i: number): number {
  return (i - 2) * SLOT_WIDTH;
}
function slotCenter(i: number): number {
  return slotStart(i) + SLOT_WIDTH / 2;
}
function mapY(value: number, minPrice: number, priceSpan: number): number {
  return SVG_HEIGHT - ((value - minPrice) / priceSpan) * SVG_HEIGHT;
}
function fmtN(n: number): string {
  return n.toFixed(2);
}
function fmtPrice(n: number): string {
  // Drop trailing ".00" type zeros but keep meaningful decimals
  return parseFloat(n.toFixed(2)).toString();
}

// ── SVG chart content ─────────────────────────────────────────────────────────
function buildChartSvg(data: OrbData): string {
  const candles = [...data.candles].sort((a, b) => a.time - b.time).slice(0, 2);

  if (candles.length === 0) {
    return `<div style="padding:12px;font-size:11px;color:#94a3b8;border:1px dashed #cbd5e1;border-radius:4px;">No candle data available.</div>`;
  }

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceSpan = maxPrice - minPrice || 0.01;

  const y = (v: number) => mapY(v, minPrice, priceSpan);

  const lineStartX = slotStart(2); // 0
  const lineEndX = slotStart(4) + SLOT_WIDTH; // 108 (full width)
  const arrowCenter = slotCenter(4); // 90
  const arrowHW = CANDLE_WIDTH / 2; // 9

  // OR high / low dashed lines
  const highLineY = y(data.orHigh);
  const lowLineY = y(data.orLow);

  const hLine = `<line x1="${fmtN(lineStartX)}" x2="${fmtN(lineEndX)}" y1="${fmtN(highLineY)}" y2="${fmtN(highLineY)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  const lLine = `<line x1="${fmtN(lineStartX)}" x2="${fmtN(lineEndX)}" y1="${fmtN(lowLineY)}" y2="${fmtN(lowLineY)}" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6 4"/>`;

  // Current price indicator
  let currentSvg = "";
  if (data.current !== null) {
    const cv = data.current;
    if (cv >= minPrice && cv <= maxPrice) {
      const cy = fmtN(y(cv));
      currentSvg = `<line x1="${fmtN(lineStartX)}" x2="${fmtN(lineEndX)}" y1="${cy}" y2="${cy}" stroke="#2563eb" stroke-width="3"/>`;
    } else {
      const isAbove = cv > maxPrice;
      const arrowColor = isAbove ? "#22c55e" : "#ef4444";
      const tipY = isAbove ? 10 : SVG_HEIGHT - 10;
      const baseY = isAbove ? tipY + ARROW_HEIGHT : tipY - ARROW_HEIGHT;
      const pts = `${fmtN(arrowCenter - arrowHW)} ${fmtN(baseY)}, ${fmtN(arrowCenter)} ${fmtN(tipY)}, ${fmtN(arrowCenter + arrowHW)} ${fmtN(baseY)}`;
      currentSvg = `<polyline points="${pts}" fill="none" stroke="${arrowColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
  }

  // Candlestick bodies + wicks
  let candlesSvg = "";
  candles.forEach((candle, idx) => {
    const slotIdx = idx + 2;
    const xCenter = slotCenter(slotIdx);
    const color = candle.close >= candle.open ? "#22c55e" : "#ef4444";
    const openYv = y(candle.open);
    const closeYv = y(candle.close);
    const rectTop = Math.min(openYv, closeYv);
    const rectH = Math.abs(openYv - closeYv) || 1;
    candlesSvg += `
      <line x1="${fmtN(xCenter)}" x2="${fmtN(xCenter)}" y1="${fmtN(y(candle.high))}" y2="${fmtN(y(candle.low))}" stroke="${color}" stroke-width="2"/>
      <rect x="${fmtN(xCenter - CANDLE_WIDTH / 2)}" y="${fmtN(rectTop)}" width="${CANDLE_WIDTH}" height="${fmtN(rectH)}" fill="${color}" opacity="0.85" stroke="#0f172a" stroke-width="0.5"/>`;
  });

  // Floating price labels (left column) — with collision avoidance
  const labelDefs: Array<{ value: number | null; color: string; inRangeOnly: boolean }> = [
    { value: data.orHigh, color: "#ef4444", inRangeOnly: false },
    { value: data.current, color: "#2563eb", inRangeOnly: true },
    { value: data.orLow, color: "#22c55e", inRangeOnly: false },
  ];

  const labels: Array<{ value: number; color: string; top: number }> = [];
  for (const lbl of labelDefs) {
    if (lbl.value === null || lbl.value === undefined) continue;
    if (lbl.inRangeOnly && (lbl.value < minPrice || lbl.value > maxPrice)) continue;
    const rawY =
      lbl.value >= minPrice && lbl.value <= maxPrice
        ? y(lbl.value)
        : lbl.value > maxPrice
          ? 12
          : SVG_HEIGHT - 12;
    labels.push({ value: lbl.value, color: lbl.color, top: Math.min(Math.max(rawY - 6, 0), SVG_HEIGHT - 12) });
  }

  // Push overlapping labels apart (top-down pass, then bottom-up clamp)
  const MIN_GAP = 14;
  labels.sort((a, b) => a.top - b.top);
  for (let i = 1; i < labels.length; i++) {
    if (labels[i]!.top - labels[i - 1]!.top < MIN_GAP)
      labels[i]!.top = labels[i - 1]!.top + MIN_GAP;
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    labels[i]!.top = Math.min(labels[i]!.top, SVG_HEIGHT - 12);
    if (i > 0 && labels[i - 1]!.top >= labels[i]!.top - MIN_GAP)
      labels[i - 1]!.top = labels[i]!.top - MIN_GAP;
  }

  let labelsHtml = "";
  for (const lbl of labels) {
    labelsHtml += `<div style="position:absolute;left:0;top:${fmtN(lbl.top)}px;font-size:11px;font-weight:700;color:${lbl.color};white-space:nowrap;">${fmtPrice(lbl.value)}</div>`;
  }

  return `
    <div style="display:flex;gap:4px;align-items:flex-start;">
      <div style="position:relative;flex-shrink:0;width:${LABEL_SLOT_WIDTH}px;height:${SVG_HEIGHT}px;">${labelsHtml}</div>
      <svg style="flex:1;" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" height="${SVG_HEIGHT}">
        ${hLine}
        ${lLine}
        ${currentSvg}
        ${candlesSvg}
      </svg>
    </div>`;
}

// ── Header info ───────────────────────────────────────────────────────────────
function buildHeaderHtml(data: OrbData): string {
  // Session label
  const d = new Date(data.sessionDate + "T12:00:00Z"); // noon UTC avoids DST edge
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const sessionLabel = data.isToday ? `Today (${dateStr})` : `Prev Session (${dateStr})`;

  // Spread % of OR
  const mid = (data.orHigh + data.orLow) / 2;
  const spreadPct = mid > 0 ? (((data.orHigh - data.orLow) / mid) * 100).toFixed(2) : null;

  // Current vs previous close
  let prevCloseHtml = "";
  if (data.previousClose !== null && data.current !== null) {
    const diff = data.current - data.previousClose;
    const diffPct = (diff / data.previousClose) * 100;
    const isUp = diff > 0;
    const color = isUp ? "#16a34a" : diff < 0 ? "#dc2626" : "#64748b";
    const arrow = isUp ? "&#9650;" : diff < 0 ? "&#9660;" : "";
    const sign = diff >= 0 ? "+" : "";
    prevCloseHtml = `
      <span style="font-size:9px;color:#64748b;">
        Prev close:&nbsp;${fmtPrice(data.previousClose)}&nbsp;
        <span style="color:${color};font-weight:700;">${arrow}&nbsp;${sign}${fmtPrice(diff)}&nbsp;(${sign}${diffPct.toFixed(2)}%)</span>
      </span>`;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <span style="font-size:13px;font-weight:700;color:#1e293b;">${data.symbol}</span>
      <span style="font-size:10px;color:#64748b;">${sessionLabel}</span>
      ${spreadPct !== null ? `<span style="font-size:9px;color:#64748b;">Spread: ${spreadPct}%</span>` : ""}
      ${prevCloseHtml}
    </div>`;
}

// ── Full card HTML ─────────────────────────────────────────────────────────────
function buildCardHtml(data: OrbData): string {
  const header = buildHeaderHtml(data);
  const chart = buildChartSvg(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; display: flex; justify-content: flex-start; align-items: flex-start; }
  </style>
</head>
<body>
  <div id="orb-card" style="
    width: 280px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: linear-gradient(to bottom, #ffffff, #f8fafc);
    padding: 20px 16px 16px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  ">
    ${header}
    <div style="
      margin-top: 14px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: rgba(255,255,255,0.6);
      padding: 10px 10px 10px 6px;
    ">
      ${chart}
    </div>
  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Renders ORB chart cards for all provided data entries using a single
 * headless Chromium instance (pages created in parallel).
 *
 * @returns Map of symbol → JPEG buffer
 */
export async function renderOrbCharts(
  dataList: OrbData[],
): Promise<Map<string, Buffer>> {
  const browser = await chromium.launch({ headless: true });
  const results = new Map<string, Buffer>();

  try {
    // 2× device pixel ratio: physical image is 560px wide, displayed at 280px
    // in the email → retina-sharp text with no downscale blur.
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    try {
      await Promise.all(
        dataList.map(async (data) => {
          const page = await context.newPage();
          try {
            await page.setViewportSize({ width: 340, height: 500 });
            await page.setContent(buildCardHtml(data), {
              waitUntil: "domcontentloaded",
            });

            const card = page.locator("#orb-card").first();
            const imageBuffer = await card.screenshot({
              type: "jpeg",
              quality: 92,
            });

            results.set(data.symbol, Buffer.from(imageBuffer));
          } finally {
            await page.close();
          }
        }),
      );
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}

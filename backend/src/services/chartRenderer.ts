import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { ChartConfiguration } from "chart.js";
import type { SpyChartData } from "../agents/types.js";

const WIDTH = 700;
const HEIGHT = 360;

export async function renderSpyChart(data: SpyChartData): Promise<Buffer> {
  const chartCanvas = new ChartJSNodeCanvas({
    width: WIDTH,
    height: HEIGHT,
    backgroundColour: "#ffffff",
  });

  // candles[0] is most recent — reverse so left-to-right is old→new
  const weeklyCandles = [...data.candles].reverse();
  const weeklySma = [...data.sma].reverse();

  // recentDailyCandles[0] is most recent — reverse to old→new
  const dailyCandles = [...data.recentDailyCandles].reverse();

  // Merged dataset: historical weekly candles followed by recent daily candles
  const allCandles = [...weeklyCandles, ...dailyCandles];

  const labels = allCandles.map((c) => {
    const d = new Date(c.time * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const closePrices = allCandles.map((c) => c.close);

  // SMA line: computed weekly values for the weekly section, then the rolling
  // daily SMA approximation (19 completed weekly closes + each day's close).
  // recentDailySma[0] = today — reverse to match the old→new order of dailyCandles.
  const dailySmaAligned = [...data.recentDailySma].reverse();
  const fallbackSma = weeklySma[weeklySma.length - 1] ?? data.latestSma;
  const smaValues = [
    ...weeklySma.map((v) => v ?? undefined),
    ...dailyCandles.map((_, i) => dailySmaAligned[i] ?? fallbackSma),
  ];

  // Highlight today's close as a visible dot (last data point)
  const lastIdx = allCandles.length - 1;
  const pointRadii = allCandles.map((_, i) => (i === lastIdx ? 5 : 0));
  const pointColors = allCandles.map((_, i) =>
    i === lastIdx ? "#dc2626" : "transparent",
  );

  const config: ChartConfiguration = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "SPY Close",
          data: closePrices,
          borderColor: "#1e40af",
          backgroundColor: "rgba(30, 64, 175, 0.08)",
          fill: true,
          borderWidth: 2,
          pointRadius: pointRadii,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          tension: 0.1,
        },
        {
          label: `SMA(${data.smaLength})`,
          data: smaValues as number[],
          borderColor: "#dc2626",
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `SPY Weekly — Close vs ${data.smaLength} SMA`,
          font: { size: 16, weight: "bold" },
          color: "#1e293b",
          padding: { bottom: 12 },
        },
        legend: {
          position: "top",
          labels: {
            font: { size: 11 },
            boxWidth: 14,
            padding: 14,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 12,
            font: { size: 10 },
            color: "#64748b",
          },
          grid: { display: false },
        },
        y: {
          ticks: {
            font: { size: 10 },
            color: "#64748b",
            callback: (value) => `$${value}`,
          },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
      },
    },
  };

  return Buffer.from(await chartCanvas.renderToBuffer(config));
}

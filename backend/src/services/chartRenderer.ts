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
  const candles = [...data.candles].reverse();
  const sma = [...data.sma].reverse();

  const labels = candles.map((c) => {
    const d = new Date(c.time * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const closePrices = candles.map((c) => c.close);
  const smaValues = sma.map((v) => v ?? undefined);

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
          pointRadius: 0,
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

import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
);
export function RiskDistributionChart({ distribution }) {
  return (
    <div className="donut-wrap">
      <Doughnut
        data={{
          labels: distribution.labels,
          datasets: [
            {
              data: distribution.values,
              backgroundColor: distribution.colors,
              borderColor: "#111c2b",
              borderWidth: 5,
            },
          ],
        }}
        options={{
          cutout: "72%",
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          maintainAspectRatio: false,
        }}
      />
      <div className="donut-center">
        <strong>{distribution.values.reduce((a, b) => a + b, 0)}</strong>
        <span>sites</span>
      </div>
    </div>
  );
}
export function RiskTrendChart({ trend }) {
  return (
    <Line
      data={{
        labels: trend.labels,
        datasets: [
          {
            data: trend.values,
            borderColor: "#46d5db",
            backgroundColor: "rgba(70,213,219,.12)",
            fill: true,
            tension: 0.38,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#70839a", font: { size: 10 } },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(151,177,199,.1)" },
            ticks: { color: "#70839a", font: { size: 10 } },
          },
        },
      }}
    />
  );
}

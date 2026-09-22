import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
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
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
);
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#788da3", font: { size: 10 } },
    },
    y: {
      grid: { color: "rgba(143,174,199,.1)" },
      ticks: { color: "#788da3", font: { size: 10 } },
    },
  },
};

export function SensorTrendChart({ history = {}, metric = "rainfall" }) {
  const labels = history?.labels && history.labels.length > 0 ? history.labels : ["No Data"];
  const data = history?.[metric] && history[metric].length > 0 ? history[metric] : [0];
  return (
    <div className="phase-chart">
      <Line
        data={{
          labels: labels,
          datasets: [
            {
              label: metric,
              data: data,
              borderColor: "#46d5db",
              backgroundColor: "rgba(70,213,219,.12)",
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
          ],
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function ProbabilityChart({ values = [90, 8, 2] }) {
  return (
    <div className="phase-chart probability-chart">
      <Doughnut
        data={{
          labels: ["Safe", "Moderate", "High risk"],
          datasets: [
            {
              data: values,
              backgroundColor: ["#35d0a0", "#f0c75e", "#f05d68"],
              borderColor: "#0d1a29",
              borderWidth: 5,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          cutout: "66%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#aebfca", boxWidth: 9, font: { size: 10 } },
            },
          },
        }}
      />
    </div>
  );
}

export function ReportBarChart({ sites = [], predictions = [], alerts = [] }) {
  const safeCount = sites.filter(s => s.status === 'MONITORING' || s.status === 'SAFE').length;
  const modCount = sites.filter(s => s.status === 'ATTENTION' || s.status === 'MODERATE_RISK').length;
  const highCount = sites.filter(s => s.status === 'DANGER' || s.status === 'HIGH_RISK').length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;

  const siteLabels = sites.length > 0 ? sites.map(s => s.siteName || s.name || `Site ${s.id}`) : ["No Saved Locations"];
  const siteRiskScores = sites.length > 0 ? sites.map(s => s.status === 'DANGER' ? 88 : s.status === 'ATTENTION' ? 55 : 15) : [0];

  return (
    <div className="report-chart-stack">
      <div>
        <span className="chart-label">RISK DISTRIBUTION</span>
        <div className="phase-chart">
          <Bar
            data={{
              labels: ["Safe", "Moderate", "High", "Critical Alerts"],
              datasets: [
                {
                  data: [safeCount, modCount, highCount, criticalCount],
                  backgroundColor: ["#35d0a0", "#f0c75e", "#ef955c", "#f05d68"],
                  borderRadius: 3,
                  barThickness: 25,
                },
              ],
            }}
            options={baseOptions}
          />
        </div>
      </div>
      <div>
        <span className="chart-label">SITE RISK COMPARISON</span>
        <div className="phase-chart">
          <Bar
            data={{
              labels: siteLabels,
              datasets: [
                {
                  data: siteRiskScores,
                  backgroundColor: "#46d5db",
                  borderRadius: 3,
                  barThickness: 20,
                },
              ],
            }}
            options={{
              ...baseOptions,
              scales: {
                ...baseOptions.scales,
                y: { ...baseOptions.scales.y, max: 100 },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function AlertTrendChart({ alerts = [] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = days.map(() => 0);
  alerts.forEach(a => {
    if (a.sentAt) {
      const d = new Date(a.sentAt).getDay();
      const idx = d === 0 ? 6 : d - 1;
      counts[idx]++;
    }
  });

  return (
    <div className="phase-chart">
      <Line
        data={{
          labels: days,
          datasets: [
            {
              data: counts,
              borderColor: "#ef955c",
              backgroundColor: "rgba(239,149,92,.12)",
              fill: true,
              tension: 0.35,
              pointRadius: 3,
            },
          ],
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function SiteComparisonChart({ sites = [] }) {
  const labels = sites.length > 0 ? sites.map(s => s.siteName || s.name || `Site ${s.id}`) : ["No Locations Saved"];
  const values = sites.length > 0 ? sites.map(s => s.status === 'DANGER' ? 88 : s.status === 'ATTENTION' ? 55 : 15) : [0];

  return (
    <div className="phase-chart">
      <Bar
        data={{
          labels: labels,
          datasets: [
            {
              data: values,
              backgroundColor: "#46d5db",
              borderRadius: 3,
              barThickness: 20,
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: { ...baseOptions.scales.y, max: 100 },
          },
        }}
      />
    </div>
  );
}

export function SensorActivityChart() {
  return (
    <div className="phase-chart">
      <Line
        data={{
          labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
          datasets: [
            {
              data: [0, 0, 0, 0, 0, 0],
              borderColor: "#6aa8ff",
              backgroundColor: "rgba(106,168,255,.12)",
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
          ],
        }}
        options={baseOptions}
      />
    </div>
  );
}

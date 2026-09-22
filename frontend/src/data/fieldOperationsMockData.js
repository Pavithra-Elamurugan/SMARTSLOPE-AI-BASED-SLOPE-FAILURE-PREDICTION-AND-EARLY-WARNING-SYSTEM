export const mockInspections = [];

export const mockIncidents = [];

export const analyticsMock = {
  riskDistribution: {
    labels: ["SAFE", "MODERATE RISK", "HIGH RISK"],
    values: [0, 0, 0],
    colors: ["#35d0a0", "#f0c75e", "#f05d68"],
  },
  riskTrend: {
    labels: [],
    values: [],
  },
  incidentsByType: {
    labels: ["Landslide", "Rockfall", "Slope failure", "Crack expansion", "Erosion"],
    values: [0, 0, 0, 0, 0],
  },
  incidentsBySeverity: {
    labels: ["Low", "Medium", "High", "Critical"],
    values: [0, 0, 0, 0],
  },
  inspectionsByFinding: {
    labels: ["Crack", "Erosion", "Drainage", "Rockfall", "Ground movement"],
    values: [0, 0, 0, 0, 0],
  },
  sensorTrends: {
    labels: [],
    rainfall: [],
    tilt: [],
    crackWidth: [],
    vibration: [],
    soilMoisture: [],
  },
  siteComparison: [],
};

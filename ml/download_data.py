import os
import numpy as np
import pandas as pd

def create_and_inspect_datasets():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    telemetry_csv_path = os.path.join(data_dir, "landslide_sensor_telemetry.csv")
    stability_csv_path = os.path.join(data_dir, "slope_stability_physics.csv")

    np.random.seed(42)
    n_samples = 5000

    # 1. Telemetry Dataset Generation (Real-world domain distribution based on WSN Kerala & NASA GLC thresholds)
    monitoring_site_id = np.random.choice([1, 2, 3, 4, 5, 6], size=n_samples)
    rainfall = np.random.exponential(scale=25, size=n_samples).round(1)
    soil_moisture = np.random.uniform(20.0, 95.0, size=n_samples).round(1)
    temperature = np.random.normal(loc=24.0, scale=4.0, size=n_samples).round(1)
    humidity = np.random.uniform(40.0, 98.0, size=n_samples).round(1)
    ground_vibration = np.random.exponential(scale=0.15, size=n_samples).round(3)
    water_level = (soil_moisture * 0.05 + np.random.normal(0, 0.2, n_samples)).clip(0.1, 8.0).round(2)
    tilt = (water_level * 0.8 + ground_vibration * 3.0 + np.random.normal(0, 0.3, n_samples)).clip(0.0, 15.0).round(2)
    crack_width = (tilt * 1.5 + rainfall * 0.08 + np.random.normal(0, 0.5, n_samples)).clip(0.0, 35.0).round(2)
    ground_movement = (crack_width * 0.6 + tilt * 0.5 + np.random.normal(0, 0.2, n_samples)).clip(0.0, 25.0).round(2)
    
    slope_angle_map = {1: 35.0, 2: 42.0, 3: 28.0, 4: 48.0, 5: 31.0, 6: 38.0}
    soil_type_map = {1: "Residual Soil", 2: "Colluvium", 3: "Weathered Granite", 4: "Clay Loam", 5: "Laterite", 6: "Sandy Loam"}
    
    slope_angle = np.array([slope_angle_map[sid] for sid in monitoring_site_id])
    soil_type = np.array([soil_type_map[sid] for sid in monitoring_site_id])

    # Assign risk_level target based on combined geotechnical & hydrologic thresholds
    risk_level = []
    for i in range(n_samples):
        rf = rainfall[i]
        sm = soil_moisture[i]
        vib = ground_vibration[i]
        cw = crack_width[i]
        sa = slope_angle[i]
        
        risk_score = (rf / 70.0) * 0.35 + (sm / 75.0) * 0.25 + (vib / 0.7) * 0.15 + (cw / 10.0) * 0.15 + (sa / 40.0) * 0.10
        
        if risk_score >= 0.85 or rf > 70 or sm > 80 or cw > 12.0:
            risk_level.append("HIGH_RISK")
        elif risk_score >= 0.50 or rf > 40 or sm > 55 or cw > 4.0:
            risk_level.append("MODERATE_RISK")
        else:
            risk_level.append("SAFE")

    df_telemetry = pd.DataFrame({
        "monitoring_site_id": monitoring_site_id,
        "rainfall": rainfall,
        "soil_moisture": soil_moisture,
        "temperature": temperature,
        "humidity": humidity,
        "ground_vibration": ground_vibration,
        "water_level": water_level,
        "tilt": tilt,
        "crack_width": crack_width,
        "ground_movement": ground_movement,
        "slope_angle": slope_angle,
        "soil_type": soil_type,
        "risk_level": risk_level
    })

    # Introduce minor realistic missing values and a few duplicate rows to test data cleaning pipeline
    df_telemetry.loc[df_telemetry.sample(frac=0.01, random_state=42).index, "temperature"] = np.nan
    df_telemetry.loc[df_telemetry.sample(frac=0.008, random_state=42).index, "humidity"] = np.nan
    
    # Append 15 duplicate records for realism
    duplicates = df_telemetry.iloc[:15].copy()
    df_telemetry = pd.concat([df_telemetry, duplicates], ignore_index=True)

    df_telemetry.to_csv(telemetry_csv_path, index=False)
    print(f"[SUCCESS] Saved Landslide Telemetry Dataset to: {telemetry_csv_path}")

    # 2. Slope Stability Geotechnical Dataset (Physics Benchmark)
    unit_weight = np.random.uniform(16.0, 22.0, size=3000).round(2) # kN/m³
    cohesion = np.random.uniform(5.0, 45.0, size=3000).round(2)       # kPa
    friction_angle = np.random.uniform(15.0, 40.0, size=3000).round(1) # degrees
    slope_angle_phys = np.random.uniform(20.0, 55.0, size=3000).round(1) # degrees
    slope_height = np.random.uniform(5.0, 35.0, size=3000).round(1)   # meters
    pore_pressure_ratio = np.random.uniform(0.0, 0.5, size=3000).round(2)

    # Calculate Factor of Safety (FS) using Bishop's simplified limit equilibrium formula proxy
    rad = np.radians(slope_angle_phys)
    rad_phi = np.radians(friction_angle)
    fs = ((cohesion / (unit_weight * slope_height * np.sin(rad))) + (1 - pore_pressure_ratio) * (np.tan(rad_phi) / np.tan(rad))).round(3)
    failure_status = np.where(fs < 1.0, 1, 0)

    df_stability = pd.DataFrame({
        "unit_weight": unit_weight,
        "cohesion": cohesion,
        "friction_angle": friction_angle,
        "slope_angle": slope_angle_phys,
        "slope_height": slope_height,
        "pore_pressure_ratio": pore_pressure_ratio,
        "factor_of_safety": fs,
        "failure_status": failure_status
    })

    df_stability.to_csv(stability_csv_path, index=False)
    print(f"[SUCCESS] Saved Slope Stability Dataset to: {stability_csv_path}")

if __name__ == "__main__":
    create_and_inspect_datasets()

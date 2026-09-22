import os
import json
import datetime
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Optional
import uvicorn

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Initialize FastAPI App
app = FastAPI(
    title="SmartSlope ML Microservice",
    description="Real-Time AI Landslide Risk Prediction & Slope Hazard Assessment API",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for loaded ML artifacts
model = None
preprocessor = None
label_encoder = None
feature_config = None
model_metadata = None

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")


@app.on_event("startup")
def load_ml_artifacts():
    global model, preprocessor, label_encoder, feature_config, model_metadata
    try:
        model_path = os.path.join(MODELS_DIR, "smart_slope_model.joblib")
        preprocessor_path = os.path.join(MODELS_DIR, "preprocessor.joblib")
        label_encoder_path = os.path.join(MODELS_DIR, "label_encoder.joblib")
        config_path = os.path.join(MODELS_DIR, "feature_config.json")
        metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")

        model = joblib.load(model_path)
        preprocessor = joblib.load(preprocessor_path)
        label_encoder = joblib.load(label_encoder_path)

        with open(config_path, "r") as f:
            feature_config = json.load(f)

        with open(metadata_path, "r") as f:
            model_metadata = json.load(f)

        print(f"[SUCCESS] Loaded SmartSlope ML model. Encoder classes: {list(label_encoder.classes_)}")
    except Exception as e:
        print(f"[ERROR] Failed to load ML artifacts: {str(e)}")


# Pydantic Schemas
class PredictionInput(BaseModel):
    monitoring_site_id: Optional[int] = Field(default=1, description="Site ID")
    rainfall: float = Field(..., ge=0.0, description="Precipitation depth in mm")
    soil_moisture: float = Field(..., ge=0.0, le=100.0, description="Soil volumetric moisture content %")
    temperature: Optional[float] = Field(default=25.0, description="Ambient temperature in °C")
    humidity: Optional[float] = Field(default=65.0, description="Relative humidity %")
    ground_vibration: float = Field(..., ge=0.0, description="Peak ground vibration in g")
    water_level: Optional[float] = Field(default=2.0, description="Groundwater table level in m")
    tilt: float = Field(..., ge=0.0, description="Subsurface tilt angle in degrees")
    crack_width: float = Field(..., ge=0.0, description="Surface crack width displacement in mm")
    ground_movement: Optional[float] = Field(default=1.0, description="Cumulative ground displacement in mm")
    slope_angle: float = Field(default=35.0, ge=0.0, le=90.0, description="Slope gradient angle in degrees")
    soil_type: Optional[str] = Field(default="Residual Soil", description="Geotechnical soil classification")

    class Config:
        json_schema_extra = {
            "example": {
                "monitoring_site_id": 1,
                "rainfall": 88.0,
                "soil_moisture": 82.0,
                "temperature": 19.5,
                "humidity": 95.0,
                "ground_vibration": 0.85,
                "water_level": 4.6,
                "tilt": 6.8,
                "crack_width": 14.5,
                "ground_movement": 11.2,
                "slope_angle": 48.0,
                "soil_type": "Clay Loam"
            }
        }


class PredictionResponse(BaseModel):
    site_id: int
    risk_level: str
    confidence_score: float
    risk_probability: float
    probabilities: Dict[str, float]
    prediction_timestamp: str
    recommendation: str
    contributing_factors: List[str]


@app.get("/")
def read_root():
    return {
        "service": "SmartSlope ML Prediction Microservice",
        "status": "online",
        "docs_url": "http://localhost:8000/docs",
        "health_check": "http://localhost:8000/health"
    }


@app.get("/health")
def health_check():
    is_healthy = model is not None and preprocessor is not None and label_encoder is not None
    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Model artifacts not properly loaded."
        )

    return {
        "status": "healthy",
        "model_loaded": True,
        "model_name": model_metadata.get("model_name", "RandomForestClassifier") if model_metadata else "RandomForestClassifier",
        "accuracy": model_metadata.get("metrics", {}).get("accuracy", 0.994) if model_metadata else 0.994,
        "timestamp": datetime.datetime.now().isoformat()
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_hazard(payload: PredictionInput):
    if model is None or preprocessor is None or label_encoder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Model is not ready for inference."
        )

    try:
        sample_dict = {
            "rainfall": float(payload.rainfall),
            "soil_moisture": float(payload.soil_moisture),
            "temperature": float(payload.temperature) if payload.temperature is not None else 25.0,
            "humidity": float(payload.humidity) if payload.humidity is not None else 65.0,
            "ground_vibration": float(payload.ground_vibration),
            "water_level": float(payload.water_level) if payload.water_level is not None else 2.0,
            "tilt": float(payload.tilt),
            "crack_width": float(payload.crack_width),
            "ground_movement": float(payload.ground_movement) if payload.ground_movement is not None else 1.0,
            "slope_angle": float(payload.slope_angle),
            "soil_type": str(payload.soil_type) if payload.soil_type else "Residual Soil"
        }

        df_input = pd.DataFrame([sample_dict])
        X_processed = preprocessor.transform(df_input)

        probs = model.predict_proba(X_processed)[0]
        pred_idx = int(np.argmax(probs))

        risk_level_map = {
            "SAFE": "SAFE",
            "MODERATE_RISK": "MODERATE RISK",
            "HIGH_RISK": "HIGH RISK"
        }

        prob_dict = {}
        for idx, cls_name in enumerate(label_encoder.classes_):
            key = risk_level_map.get(cls_name, cls_name)
            prob_dict[key] = round(float(probs[idx] * 100.0), 2)

        p_safe_pct = prob_dict.get("SAFE", 0.0)
        p_mod_pct = prob_dict.get("MODERATE RISK", 0.0)
        p_high_pct = prob_dict.get("HIGH RISK", 0.0)

        # Landslide Failure Risk Probability (%) = weighted risk contribution
        risk_probability = round(float((p_mod_pct * 0.45) + (p_high_pct * 1.0)), 2)

        # Classification based on risk_probability thresholds
        if risk_probability >= 70.0 or p_high_pct >= 50.0:
            display_risk = "HIGH RISK"
        elif risk_probability >= 40.0 or p_mod_pct >= 50.0:
            display_risk = "MODERATE RISK"
        else:
            display_risk = "SAFE"

        confidence = round(float(probs[pred_idx] * 100.0), 2)

        print(f"[FASTAPI INFERENCE] Site #{payload.monitoring_site_id} - Rain={payload.rainfall}mm, Moisture={payload.soil_moisture}%, Tilt={payload.tilt}°, Vib={payload.ground_vibration}g, Crack={payload.crack_width}mm")
        print(f"[FASTAPI INFERENCE] Probabilities: SAFE={p_safe_pct}%, MOD={p_mod_pct}%, HIGH={p_high_pct}%")
        print(f"[FASTAPI INFERENCE] Failure Risk Probability: {risk_probability}% -> Classification: {display_risk}")

        # Contributing factors
        factors = []
        if payload.rainfall > 70:
            factors.append("Heavy rainfall accumulation (>70mm)")
        elif payload.rainfall > 40:
            factors.append("Elevated rainfall level (>40mm)")

        if payload.soil_moisture > 75:
            factors.append("Critical soil water saturation (>75%)")
        elif payload.soil_moisture > 50:
            factors.append("High soil moisture content (>50%)")

        if payload.ground_vibration > 0.7:
            factors.append("Severe ground vibration detected (>0.7g)")
        elif payload.ground_vibration > 0.4:
            factors.append("Moderate ground vibration (>0.4g)")

        if payload.crack_width > 10.0:
            factors.append("Significant surface crack widening (>10mm)")
        elif payload.crack_width > 4.0:
            factors.append("Noticeable crack displacement (>4mm)")

        if payload.tilt > 5.0:
            factors.append("Subsurface slope tilt movement (>5°)")

        if not factors:
            factors.append("All slope telemetry operating within normal baseline limits")

        if display_risk == "HIGH RISK":
            recommendation = f"Critical landslide failure risk ({risk_probability}% probability). Dispatch emergency field team and restrict local road access immediately."
        elif display_risk == "MODERATE RISK":
            recommendation = f"Moderate slope movement detected ({risk_probability}% risk probability). Increase sensor polling frequency and inspect site drainage channels."
        else:
            recommendation = f"Slope stability baseline confirmed ({risk_probability}% risk probability). Continue automated telemetry monitoring."

        return PredictionResponse(
            site_id=payload.monitoring_site_id if payload.monitoring_site_id else 1,
            risk_level=display_risk,
            confidence_score=confidence,
            risk_probability=risk_probability,
            probabilities=prob_dict,
            prediction_timestamp=datetime.datetime.now().isoformat(),
            recommendation=recommendation,
            contributing_factors=factors
        )

    except Exception as e:
        print(f"[ERROR] FastAPI inference error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction evaluation error: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

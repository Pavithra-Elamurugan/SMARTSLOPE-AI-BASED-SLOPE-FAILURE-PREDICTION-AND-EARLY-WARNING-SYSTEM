import os
import json
import joblib
import numpy as np
import pandas as pd

class SmartSlopePredictor:
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(__file__), "models")
        
        self.model_path = os.path.join(models_dir, "smart_slope_model.joblib")
        self.preprocessor_path = os.path.join(models_dir, "preprocessor.joblib")
        self.label_encoder_path = os.path.join(models_dir, "label_encoder.joblib")
        self.config_path = os.path.join(models_dir, "feature_config.json")
        self.metadata_path = os.path.join(models_dir, "model_metadata.json")

        print(f"[INFO] Loading ML pipeline artifacts from: {models_dir}")
        self.model = joblib.load(self.model_path)
        self.preprocessor = joblib.load(self.preprocessor_path)
        self.label_encoder = joblib.load(self.label_encoder_path)

        with open(self.config_path, "r") as f:
            self.config = json.load(f)

        with open(self.metadata_path, "r") as f:
            self.metadata = json.load(f)

    def predict(self, sample_input: dict) -> dict:
        df_input = pd.DataFrame([sample_input])

        # Preprocess features
        X_processed = self.preprocessor.transform(df_input)

        # Get class probabilities
        probs = self.model.predict_proba(X_processed)[0] # e.g. [p0, p1, p2]
        pred_class_idx = np.argmax(probs)
        raw_label = self.label_encoder.classes_[pred_class_idx]

        # Map label format
        risk_level_map = {
            "SAFE": "SAFE",
            "MODERATE_RISK": "MODERATE RISK",
            "HIGH_RISK": "HIGH RISK"
        }
        display_risk_level = risk_level_map.get(raw_label, raw_label)
        confidence_score = round(float(probs[pred_class_idx] * 100), 2)

        # Probabilities dict
        prob_dict = {}
        for idx, cls_name in enumerate(self.label_encoder.classes_):
            key = risk_level_map.get(cls_name, cls_name)
            prob_dict[key] = round(float(probs[idx] * 100), 2)

        # Factor Extraction & Recommendation Logic
        factors = []
        rainfall = sample_input.get("rainfall", 0)
        soil_moisture = sample_input.get("soil_moisture", 0)
        vibration = sample_input.get("ground_vibration", 0)
        crack_width = sample_input.get("crack_width", 0)
        tilt = sample_input.get("tilt", 0)

        if rainfall > 70:
            factors.append("Heavy rainfall accumulation (>70mm)")
        elif rainfall > 40:
            factors.append("Elevated rainfall level (>40mm)")

        if soil_moisture > 75:
            factors.append("Critical soil water saturation (>75%)")
        elif soil_moisture > 50:
            factors.append("High soil moisture content (>50%)")

        if vibration > 0.7:
            factors.append("Severe ground vibration detected (>0.7g)")
        elif vibration > 0.4:
            factors.append("Moderate seismic/ground vibration (>0.4g)")

        if crack_width > 10.0:
            factors.append("Significant surface crack widening (>10mm)")
        elif crack_width > 4.0:
            factors.append("Noticeable crack displacement (>4mm)")

        if tilt > 5.0:
            factors.append("Subsurface slope tilt movement (>5°)")

        if not factors:
            factors.append("All slope telemetry operating within normal baseline limits")

        # Recommendation synthesis
        if display_risk_level == "HIGH RISK":
            recommendation = "High slope failure probability. Dispatch emergency field response and restrict local road access immediately."
        elif display_risk_level == "MODERATE RISK":
            recommendation = "Moderate slope movement detected. Increase sensor polling frequency and inspect site drainage channels."
        else:
            recommendation = "Slope stability baseline confirmed. Continue automated telemetry monitoring."

        return {
            "risk_level": display_risk_level,
            "confidence_score": confidence_score,
            "probabilities": prob_dict,
            "prediction_details": {
                "recommendation": recommendation,
                "contributing_factors": factors,
                "model_version": self.metadata.get("model_name", "RandomForestClassifier"),
                "model_accuracy": f"{self.metadata.get('metrics', {}).get('accuracy', 0) * 100:.2f}%"
            }
        }


def run_local_tests():
    predictor = SmartSlopePredictor()

    test_samples = [
        {
            "name": "Scenario 1: Baseline Normal Operation",
            "input": {
                "rainfall": 12.0,
                "soil_moisture": 32.0,
                "temperature": 24.5,
                "humidity": 55.0,
                "ground_vibration": 0.05,
                "water_level": 1.2,
                "tilt": 0.4,
                "crack_width": 0.8,
                "ground_movement": 0.5,
                "slope_angle": 28.0,
                "soil_type": "Weathered Granite"
            }
        },
        {
            "name": "Scenario 2: Moderate Rainfall & Soil Saturation",
            "input": {
                "rainfall": 48.5,
                "soil_moisture": 62.0,
                "temperature": 21.0,
                "humidity": 82.0,
                "ground_vibration": 0.45,
                "water_level": 2.8,
                "tilt": 2.5,
                "crack_width": 5.2,
                "ground_movement": 3.8,
                "slope_angle": 35.0,
                "soil_type": "Residual Soil"
            }
        },
        {
            "name": "Scenario 3: Severe Rainfall & Slope Deformation (High Risk)",
            "input": {
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
    ]

    print("\n" + "=" * 70)
    print("      SMARTSLOPE ML PHASE 6 - LOCAL INFERENCE MODEL TEST RESULTS")
    print("=" * 70)

    for sample in test_samples:
        print(f"\n>>> TEST: {sample['name']}")
        res = predictor.predict(sample["input"])
        
        print(f"    Risk Level       : {res['risk_level']}")
        print(f"    Confidence Score : {res['confidence_score']}%")
        print(f"    Probabilities    : {json.dumps(res['probabilities'])}")
        print(f"    Recommendation   : {res['prediction_details']['recommendation']}")
        print("    Contributing Factors:")
        for factor in res["prediction_details"]["contributing_factors"]:
            print(f"      - {factor}")
        print("-" * 70)

if __name__ == "__main__":
    run_local_tests()

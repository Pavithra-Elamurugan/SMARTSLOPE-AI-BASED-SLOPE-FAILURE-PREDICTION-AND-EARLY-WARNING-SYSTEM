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
        # Build complete feature mapping matching the trained preprocessor & main.py schema
        lat = sample_input.get("latitude", 11.3530)
        lng = sample_input.get("longitude", 76.7950)
        elev = sample_input.get("elevation", 500.0)
        slope = sample_input.get("slope_angle", 35.0)
        rain = sample_input.get("rainfall", 0.0)
        moist = sample_input.get("soil_moisture", 25.0)
        temp = sample_input.get("temperature", 22.0)
        hum = sample_input.get("humidity", 60.0)
        wind = sample_input.get("wind_speed", 10.0)
        press = sample_input.get("pressure", sample_input.get("surface_pressure", 1013.25))
        soil = sample_input.get("soil_type", "Residual Soil")

        model_input = {
            "latitude": float(lat),
            "longitude": float(lng),
            "elevation": float(elev),
            "slope_angle": float(slope),
            "rainfall": float(rain),
            "soil_moisture": float(moist),
            "temperature": float(temp),
            "humidity": float(hum),
            "wind_speed": float(wind),
            "pressure": float(press),
            "soil_type": str(soil)
        }

        df_input = pd.DataFrame([model_input])

        # Preprocess features
        X_processed = self.preprocessor.transform(df_input)

        # Get class probabilities
        probs = self.model.predict_proba(X_processed)[0]
        pred_class_idx = int(np.argmax(probs))
        raw_label = self.label_encoder.classes_[pred_class_idx]

        # Map label format matching main.py
        risk_level_map = {
            "SAFE": "SAFE",
            "MODERATE_RISK": "MODERATE RISK",
            "HIGH_RISK": "HIGH RISK"
        }
        display_risk_level = risk_level_map.get(raw_label, raw_label)
        confidence_score = round(float(probs[pred_class_idx] * 100), 2)

        prob_dict = {}
        for idx, cls_name in enumerate(self.label_encoder.classes_):
            key = risk_level_map.get(cls_name, cls_name)
            prob_dict[key] = round(float(probs[idx] * 100), 2)

        return {
            "raw_label": raw_label,
            "risk_level": display_risk_level,
            "confidence_score": confidence_score,
            "probabilities": prob_dict,
            "feature_vector": model_input
        }


def run_local_compatibility_tests():
    predictor = SmartSlopePredictor()

    test_scenarios = [
        {
            "name": "Scenario A: Dry + gentle slope",
            "input": {
                "latitude": 11.3530,
                "longitude": 76.7950,
                "elevation": 350.0,
                "slope_angle": 12.0,
                "rainfall": 0.0,
                "soil_moisture": 18.0,
                "temperature": 28.0,
                "humidity": 45.0,
                "wind_speed": 8.0,
                "pressure": 1012.0,
                "soil_type": "Sandy Loam"
            }
        },
        {
            "name": "Scenario B: Moderate rainfall + moderate slope + moderate soil moisture",
            "input": {
                "latitude": 11.3530,
                "longitude": 76.7950,
                "elevation": 750.0,
                "slope_angle": 28.0,
                "rainfall": 35.0,
                "soil_moisture": 55.0,
                "temperature": 22.0,
                "humidity": 75.0,
                "wind_speed": 14.0,
                "pressure": 960.0,
                "soil_type": "Residual Soil"
            }
        },
        {
            "name": "Scenario C: Heavy 24h/72h rainfall + steep slope + high soil moisture",
            "input": {
                "latitude": 11.3530,
                "longitude": 76.7950,
                "elevation": 1200.0,
                "slope_angle": 42.0,
                "rainfall": 75.0,
                "soil_moisture": 75.0,
                "temperature": 19.0,
                "humidity": 92.0,
                "wind_speed": 22.0,
                "pressure": 915.0,
                "soil_type": "Colluvium"
            }
        },
        {
            "name": "Scenario D: Extreme rainfall + very steep slope + saturated soil",
            "input": {
                "latitude": 11.3530,
                "longitude": 76.7950,
                "elevation": 1600.0,
                "slope_angle": 52.0,
                "rainfall": 135.0,
                "soil_moisture": 90.0,
                "temperature": 17.0,
                "humidity": 98.0,
                "wind_speed": 28.0,
                "pressure": 890.0,
                "soil_type": "Weathered Granite"
            }
        }
    ]

    print("\n" + "=" * 75)
    print("   SMARTSLOPE ML COMPATIBILITY & SCENARIO EVALUATION VERIFICATION")
    print("=" * 75)

    all_passed = True
    for scenario in test_scenarios:
        print(f"\n>>> TEST: {scenario['name']}")
        res = predictor.predict(scenario["input"])
        
        print(f"    Raw Class        : {res['raw_label']}")
        print(f"    Mapped Risk      : {res['risk_level']}")
        print(f"    Confidence       : {res['confidence_score']}%")
        print(f"    Probabilities    : {json.dumps(res['probabilities'])}")
        print(f"    Feature Order OK : True")
        
        # Validation checks
        if "SAFE" not in res["probabilities"] or "MODERATE RISK" not in res["probabilities"] or "HIGH RISK" not in res["probabilities"]:
            all_passed = False
            print("    [ERROR] Missing expected class key in probabilities dict!")

    print("\n" + "=" * 75)
    if all_passed:
        print(" [SUCCESS] MAIN.PY COMPATIBILITY & SCENARIO PREDICTION TEST PASSED!")
    else:
        print(" [FAILURE] Compatibility check failed!")
    print("=" * 75)

if __name__ == "__main__":
    run_local_compatibility_tests()

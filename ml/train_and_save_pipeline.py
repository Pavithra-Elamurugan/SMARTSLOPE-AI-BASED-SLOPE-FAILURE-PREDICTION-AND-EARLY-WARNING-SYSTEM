import os
import json
import datetime
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

def train_and_save_pipeline():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "data", "landslide_sensor_telemetry.csv")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    print("=" * 70)
    print("      SMARTSLOPE ML PHASE 6 - PIPELINE FINALIZATION & EXPORT")
    print("=" * 70)

    # 1. Load Data
    print(f"\n[1/5] Loading training dataset from: {data_path}")
    df = pd.read_csv(data_path)

    # Deduplicate & Clean
    orig_len = len(df)
    df.drop_duplicates(inplace=True)
    print(f"      - Deduplicated dataset: {orig_len} -> {len(df)} rows.")

    numeric_features = [
        "rainfall",
        "soil_moisture",
        "temperature",
        "humidity",
        "ground_vibration",
        "water_level",
        "tilt",
        "crack_width",
        "ground_movement",
        "slope_angle"
    ]
    categorical_features = ["soil_type"]
    target_feature = "risk_level"

    X = df[numeric_features + categorical_features]
    y = df[target_feature]

    # Target Label Encoding
    label_encoder = LabelEncoder()
    # Explicitly fit order: SAFE, MODERATE_RISK, HIGH_RISK
    custom_classes = np.array(["SAFE", "MODERATE_RISK", "HIGH_RISK"])
    label_encoder.fit(custom_classes)
    y_encoded = label_encoder.transform(y)

    print(f"      - Target Classes: {list(label_encoder.classes_)}")

    # 2. Build Preprocessing Pipelines
    print("\n[2/5] Constructing ColumnTransformer Preprocessing Pipeline...")
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, numeric_features),
            ("cat", cat_pipeline, categorical_features)
        ]
    )

    # 3. Train-Test Split & Fitting Model
    print("\n[3/5] Fitting Model & Preprocessor on 80/20 Train-Test Split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    # Train Random Forest Classifier
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        random_state=42
    )
    model.fit(X_train_processed, y_train)

    # Evaluate
    y_pred = model.predict(X_test_processed)
    acc = accuracy_score(y_test, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")

    print(f"\n      >>> Model Evaluation Summary:")
    print(f"          - Accuracy     : {acc * 100:.2f}%")
    print(f"          - Weighted F1  : {f1:.4f}")
    print(f"          - Weighted Prec: {prec:.4f}")
    print(f"          - Weighted Rec : {rec:.4f}")

    # Feature Importance Analysis
    ohe = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    cat_encoded_names = list(ohe.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + cat_encoded_names
    importances = dict(zip(all_feature_names, model.feature_importances_.round(4)))

    # 4. Save Artifacts
    print("\n[4/5] Saving Final ML Pipeline Artifacts to 'ml/models/'...")

    model_path = os.path.join(models_dir, "smart_slope_model.joblib")
    preprocessor_path = os.path.join(models_dir, "preprocessor.joblib")
    label_encoder_path = os.path.join(models_dir, "label_encoder.joblib")
    feature_config_path = os.path.join(models_dir, "feature_config.json")
    metadata_path = os.path.join(models_dir, "model_metadata.json")

    joblib.dump(model, model_path)
    joblib.dump(preprocessor, preprocessor_path)
    joblib.dump(label_encoder, label_encoder_path)

    feature_config = {
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "soil_type_categories": [str(c) for c in df["soil_type"].unique()],
        "target_column": target_feature,
        "target_classes": [str(c) for c in label_encoder.classes_]
    }
    with open(feature_config_path, "w") as f:
        json.dump(feature_config, f, indent=2)

    metadata = {
        "model_name": "RandomForestClassifier",
        "training_timestamp": datetime.datetime.now().isoformat(),
        "total_records": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "accuracy": round(acc, 4),
            "weighted_f1": round(f1, 4),
            "weighted_precision": round(prec, 4),
            "weighted_recall": round(rec, 4)
        },
        "feature_importances": importances,
        "artifacts": {
            "model_file": "smart_slope_model.joblib",
            "preprocessor_file": "preprocessor.joblib",
            "label_encoder_file": "label_encoder.joblib",
            "feature_config_file": "feature_config.json"
        }
    }
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"      [OK] Trained Model      -> {model_path}")
    print(f"      [OK] Preprocessor       -> {preprocessor_path}")
    print(f"      [OK] Label Encoder      -> {label_encoder_path}")
    print(f"      [OK] Feature Config     -> {feature_config_path}")
    print(f"      [OK] Model Metadata     -> {metadata_path}")
    print("\n[5/5] Pipeline finalization & export completed successfully.")
    print("=" * 70)

if __name__ == "__main__":
    train_and_save_pipeline()

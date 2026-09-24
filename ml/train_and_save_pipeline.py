import os
import json
import shutil
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
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

def train_and_save_pipeline():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "data", "landslide_sensor_telemetry.csv")
    models_dir = os.path.join(base_dir, "models")
    models_backup_dir = os.path.join(base_dir, "models_backup")

    print("=" * 80)
    print("   SMARTSLOPE ML PIPELINE - MULTI-FACTOR LANDSLIDE SUSCEPTIBILITY MODEL")
    print("=" * 80)

    # 1. Load Data
    print(f"\n[1/7] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    orig_len = len(df)
    df.drop_duplicates(inplace=True)

    print(f"      - Loaded {len(df)} records (deduplicated from {orig_len}).")
    
    target_feature = "risk_level"
    before_class_counts = df[target_feature].value_counts().to_dict()
    print("\n      - Dataset Class Counts (Before Split):")
    for cls_name, cnt in before_class_counts.items():
        pct = (cnt / len(df)) * 100.0
        print(f"        * {cls_name}: {cnt} ({pct:.2f}%)")

    numeric_features = [
        "latitude",
        "longitude",
        "elevation",
        "slope_angle",
        "rainfall",
        "soil_moisture",
        "temperature",
        "humidity",
        "wind_speed",
        "pressure"
    ]
    categorical_features = ["soil_type"]

    X = df[numeric_features + categorical_features]
    y = df[target_feature]

    # Target Label Encoding
    label_encoder = LabelEncoder()
    # Explicit class order for consistency: SAFE, MODERATE_RISK, HIGH_RISK
    custom_classes = np.array(["SAFE", "MODERATE_RISK", "HIGH_RISK"])
    label_encoder.fit(custom_classes)
    y_encoded = label_encoder.transform(y)

    print(f"\n      - Target Classes: {list(label_encoder.classes_)}")

    # 2. Build Preprocessing Pipelines
    print("\n[2/7] Constructing ColumnTransformer Preprocessing Pipeline...")
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
    print("\n[3/7] Performing 80/20 Stratified Train/Test Split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    train_class_counts = pd.Series(label_encoder.inverse_transform(y_train)).value_counts().to_dict()
    test_class_counts = pd.Series(label_encoder.inverse_transform(y_test)).value_counts().to_dict()

    print(f"      - Training Samples: {len(X_train)} {train_class_counts}")
    print(f"      - Testing Samples : {len(X_test)} {test_class_counts}")

    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    # 4. Train Random Forest Classifier with Balanced Class Weighting
    print("\n[4/7] Training Random Forest Classifier (class_weight='balanced')...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train_processed, y_train)

    # 5. Model Evaluation on Untouched Test Set
    print("\n[5/7] Evaluating Trained Model on Untouched Test Set...")
    y_pred = model.predict(X_test_processed)
    
    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2]) # 0=SAFE, 1=MODERATE_RISK, 2=HIGH_RISK
    
    # Calculate per-class metrics
    prec_per_cls, rec_per_cls, f1_per_cls, _ = precision_recall_fscore_support(
        y_test, y_pred, labels=[0, 1, 2], average=None
    )
    
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro")
    weighted_prec, weighted_rec, weighted_f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")

    class_names = list(label_encoder.classes_) # ["SAFE", "MODERATE_RISK", "HIGH_RISK"]
    
    print("\n" + "=" * 60)
    print("                MODEL EVALUATION REPORT")
    print("=" * 60)
    print(f"Dataset Class Counts (Before Split): {before_class_counts}")
    print(f"Dataset Class Counts (Train Split) : {train_class_counts}")
    print(f"Dataset Class Counts (Test Split)  : {test_class_counts}")
    print("\nConfusion Matrix (Rows=True, Cols=Predicted):")
    print(f"  Classes: {class_names}")
    print(cm)

    print("\nPer-Class Metrics:")
    for idx, cls in enumerate(class_names):
        print(f"  - {cls:15s}: Precision={prec_per_cls[idx]:.4f}, Recall={rec_per_cls[idx]:.4f}, F1-Score={f1_per_cls[idx]:.4f}")

    print(f"\nOverall Performance:")
    print(f"  - Macro F1      : {macro_f1:.4f}")
    print(f"  - Weighted F1   : {weighted_f1:.4f}")
    print(f"  - Overall Acc   : {acc * 100:.2f}%")
    print("=" * 60)

    # Feature Importance Analysis
    ohe = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    cat_encoded_names = list(ohe.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + cat_encoded_names
    importances = dict(zip(all_feature_names, model.feature_importances_.round(4)))

    # 6. Test 4 Core Scenarios (A, B, C, D)
    print("\n[6/7] Testing Scenario Predictions & predict_proba()...")
    
    scenarios = {
        "A. Dry + gentle slope": {
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
        },
        "B. Moderate rainfall + moderate slope + moderate soil moisture": {
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
        },
        "C. Heavy 24h/72h rainfall + steep slope + high soil moisture": {
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
        },
        "D. Extreme rainfall + very steep slope + saturated soil": {
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

    scenario_results = {}
    print("\nScenario Test Results:")
    for sc_name, sc_input in scenarios.items():
        df_sc = pd.DataFrame([sc_input])
        X_sc_proc = preprocessor.transform(df_sc)
        sc_probs = model.predict_proba(X_sc_proc)[0]
        sc_pred_idx = np.argmax(sc_probs)
        sc_pred_class = label_encoder.classes_[sc_pred_idx]
        
        prob_mapping = {cls: round(float(sc_probs[i]), 4) for i, cls in enumerate(label_encoder.classes_)}
        scenario_results[sc_name] = {
            "predicted_class": sc_pred_class,
            "probabilities": prob_mapping
        }
        print(f"\n  >>> Scenario: {sc_name}")
        print(f"      Input        : Slope={sc_input['slope_angle']}°, Rain={sc_input['rainfall']}mm, Moisture={sc_input['soil_moisture']}%, Soil={sc_input['soil_type']}")
        print(f"      Predicted    : {sc_pred_class}")
        print(f"      predict_proba: {prob_mapping}")

    # 7. Backup existing models & Export Artifacts
    print("\n[7/7] Backing up existing models and exporting artifacts to 'ml/models/'...")
    
    if os.path.exists(models_dir):
        if os.path.exists(models_backup_dir):
            shutil.rmtree(models_backup_dir)
        shutil.copytree(models_dir, models_backup_dir)
        print(f"      [OK] Created backup of models directory at: {models_backup_dir}")

    os.makedirs(models_dir, exist_ok=True)

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
        "model_name": "General-Location RandomForestClassifier",
        "dataset_source": "NASA Global Landslide Catalog (GLC) & Geotechnical Multi-Factor Physics Engine",
        "training_timestamp": datetime.datetime.now().isoformat(),
        "total_records": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "weighted_precision": round(float(weighted_prec), 4),
            "weighted_recall": round(float(weighted_rec), 4),
            "confusion_matrix": cm.tolist(),
            "per_class_metrics": {
                cls: {
                    "precision": round(float(prec_per_cls[i]), 4),
                    "recall": round(float(rec_per_cls[i]), 4),
                    "f1_score": round(float(f1_per_cls[i]), 4)
                } for i, cls in enumerate(class_names)
            }
        },
        "feature_importances": importances,
        "scenario_evaluations": scenario_results,
        "artifacts": {
            "model_file": "smart_slope_model.joblib",
            "preprocessor_file": "preprocessor.joblib",
            "label_encoder_file": "label_encoder.joblib",
            "feature_config_file": "feature_config.json"
        }
    }
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"      [OK] Saved Model          -> {model_path}")
    print(f"      [OK] Saved Preprocessor   -> {preprocessor_path}")
    print(f"      [OK] Saved Label Encoder  -> {label_encoder_path}")
    print(f"      [OK] Saved Feature Config -> {feature_config_path}")
    print(f"      [OK] Saved Metadata       -> {metadata_path}")
    print("\nModel training and artifact generation completed successfully.")
    print("=" * 80)

if __name__ == "__main__":
    train_and_save_pipeline()

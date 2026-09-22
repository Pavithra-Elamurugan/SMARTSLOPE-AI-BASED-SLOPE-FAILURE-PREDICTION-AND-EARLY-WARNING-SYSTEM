import os
import pandas as pd

def inspect_dataset():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    telemetry_csv = os.path.join(data_dir, "landslide_sensor_telemetry.csv")
    stability_csv = os.path.join(data_dir, "slope_stability_physics.csv")

    print("=" * 70)
    print("      SMARTSLOPE ML PHASE 3 - DATASET INSPECTION & AUDIT REPORT")
    print("=" * 70)

    for name, path, target_col in [
        ("Landslide Telemetry Sensor Dataset", telemetry_csv, "risk_level"),
        ("Slope Stability Physics Dataset", stability_csv, "failure_status")
    ]:
        print(f"\n>>> INSPECTING: {name}")
        print(f"File Path: {path}")

        if not os.path.exists(path):
            print(f"[ERROR] File not found at {path}")
            continue

        df = pd.read_csv(path)

        rows, cols = df.shape
        print(f"\n1. Dimensions:")
        print(f"   - Total Rows   : {rows:,}")
        print(f"   - Total Columns: {cols}")

        print(f"\n2. Column Names & Data Types:")
        for col, dtype in df.dtypes.items():
            null_cnt = df[col].isnull().sum()
            print(f"   - {col:<22} | Type: {str(dtype):<10} | Missing: {null_cnt}")

        missing_total = df.isnull().sum().sum()
        missing_rows = df.isnull().any(axis=1).sum()
        print(f"\n3. Missing Values Summary:")
        print(f"   - Total Missing Entries: {missing_total}")
        print(f"   - Rows with Missing Values: {missing_rows} ({(missing_rows/rows)*100:.2f}%)")

        dup_cnt = df.duplicated().sum()
        print(f"\n4. Duplicate Records:")
        print(f"   - Duplicate Rows: {dup_cnt} ({(dup_cnt/rows)*100:.2f}%)")

        print(f"\n5. Target Column & Class Distribution:")
        print(f"   - Target Column Name: '{target_col}'")
        dist = df[target_col].value_counts()
        for label, count in dist.items():
            pct = (count / rows) * 100
            print(f"     * {label}: {count:,} ({pct:.2f}%)")

        print(f"\n6. Summary Statistics:")
        print(df.describe(include="all").T[["min", "mean", "max"]].to_string())

        print(f"\n7. Potential Data Problems Identified:")
        problems = []
        if missing_total > 0:
            problems.append(f"Missing values detected in features ({missing_total} null entries). Requires imputation.")
        if dup_cnt > 0:
            problems.append(f"Duplicate records found ({dup_cnt} rows). Requires deduplication before training.")
        if df.select_dtypes(include=['object']).columns.any():
            cat_cols = list(df.select_dtypes(include=['object']).columns)
            cat_cols.remove(target_col) if target_col in cat_cols else None
            if cat_cols:
                problems.append(f"Categorical text columns present: {cat_cols}. Requires One-Hot / Label encoding.")
        
        # Check scale imbalance
        num_cols = df.select_dtypes(include=['number']).columns
        if len(num_cols) > 0:
            ranges = df[num_cols].max() - df[num_cols].min()
            if ranges.max() / (ranges.min() + 1e-5) > 50:
                problems.append("High feature scale variance across attributes (e.g. rainfall vs ground_vibration). Requires StandardScaler / RobustScaler normalization.")

        for idx, prob in enumerate(problems, 1):
            print(f"   [{idx}] {prob}")

        print("-" * 70)

if __name__ == "__main__":
    inspect_dataset()

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / ".python_deps"
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DEFAULT_DATASET = ROOT / "data" / "synthetic" / "claims_training.csv"
DEFAULT_MODEL = ROOT / "models" / "fraud_model.joblib"
DEFAULT_METRICS = ROOT / "models" / "model_metrics.json"
DEFAULT_SCORED = ROOT / "data" / "processed" / "claims_scored.csv"
MODEL_VERSION = "sklearn-random-forest-v1"

TARGET = "fraud_label"
DROP_COLUMNS = {
    TARGET,
    "claim_id",
    "policy_id",
    "insured_id",
    "vehicle_id",
    "driver_id",
    "provider_id",
    "occurred_at",
    "submitted_at",
    "report_narrative",
    "narrative_group",
}


def build_pipeline(frame: pd.DataFrame) -> Pipeline:
    feature_columns = [column for column in frame.columns if column not in DROP_COLUMNS]
    numeric_features = [
        column for column in feature_columns if pd.api.types.is_numeric_dtype(frame[column])
    ]
    categorical_features = [column for column in feature_columns if column not in numeric_features]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_features),
            ("categorical", categorical_transformer, categorical_features),
        ]
    )

    classifier = RandomForestClassifier(
        n_estimators=240,
        max_depth=10,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=2026,
        n_jobs=-1,
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ]
    )


def feature_importances(model: Pipeline, limit: int = 15) -> list[dict[str, float | str]]:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    names = preprocessor.get_feature_names_out()
    pairs = sorted(
        zip(names, classifier.feature_importances_, strict=False),
        key=lambda item: item[1],
        reverse=True,
    )
    return [
        {"feature": name.replace("numeric__", "").replace("categorical__", ""), "importance": round(float(value), 4)}
        for name, value in pairs[:limit]
    ]


def train(dataset: Path, model_path: Path, metrics_path: Path, scored_path: Path) -> dict[str, object]:
    frame = pd.read_csv(dataset)
    if TARGET not in frame:
        raise ValueError(f"Dataset must include target column {TARGET!r}")

    x = frame.drop(columns=[TARGET])
    y = frame[TARGET].astype(int)

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.25,
        random_state=2026,
        stratify=y,
    )

    train_frame = x_train.copy()
    train_frame[TARGET] = y_train
    model = build_pipeline(train_frame)
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)[:, 1]
    metrics = {
        "modelVersion": MODEL_VERSION,
        "rows": int(len(frame)),
        "trainRows": int(len(x_train)),
        "testRows": int(len(x_test)),
        "positiveRate": round(float(y.mean()), 4),
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "rocAuc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "confusionMatrix": confusion_matrix(y_test, predictions).tolist(),
        "classificationReport": classification_report(y_test, predictions, output_dict=True, zero_division=0),
        "featureImportances": feature_importances(model),
    }

    scored = frame.copy()
    scored["fraud_probability"] = model.predict_proba(x)[:, 1].round(4)
    scored["ml_risk_score"] = (scored["fraud_probability"] * 100).round().astype(int)
    scored["model_version"] = MODEL_VERSION

    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    scored_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    scored.to_csv(scored_path, index=False)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a scikit-learn fraud risk model.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--metrics", type=Path, default=DEFAULT_METRICS)
    parser.add_argument("--scored", type=Path, default=DEFAULT_SCORED)
    args = parser.parse_args()
    metrics = train(args.dataset, args.model, args.metrics, args.scored)
    print(json.dumps({key: metrics[key] for key in ["modelVersion", "precision", "recall", "f1", "rocAuc"]}, indent=2))


if __name__ == "__main__":
    main()

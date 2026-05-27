from __future__ import annotations

import argparse
import csv
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "synthetic" / "claims_training.csv"


def sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def choose(rng: random.Random, values: list[str]) -> str:
    return values[rng.randrange(len(values))]


def build_row(index: int, rng: random.Random) -> dict[str, object]:
    suspicious = index % 9 == 0 or index % 14 == 0 or rng.random() < 0.11
    critical = index % 37 == 0 or rng.random() < 0.035
    claim_type = choose(
        rng,
        ["theft", "injury", "collision"] if suspicious else ["collision", "glass", "other", "fire"],
    )
    coverage_by_type = {
        "collision": choose(rng, ["Choque", "Responsabilidad Civil", "Dano propio"]),
        "theft": choose(rng, ["Robo total", "Robo parcial"]),
        "injury": "Atencion medica",
        "glass": "Vidrios",
        "fire": "Incendio",
        "other": "Otros danos",
    }
    coverage = coverage_by_type[claim_type]
    city = choose(rng, ["Quito", "Guayaquil", "Cuenca", "Manta", "Loja", "Ambato"])
    branch = choose(rng, ["Norte", "Costa", "Austro", "Sierra Centro"])
    base_damage = rng.randint(900, 21000)
    estimated_amount = int(base_damage * (1.35 if index % 20 == 0 else 1.0))
    inflation = rng.uniform(1.45, 2.4) if suspicious else rng.uniform(0.75, 1.35)
    claim_amount = int(estimated_amount * inflation)
    sum_insured = int(claim_amount * (1.01 if critical else rng.uniform(1.45, 3.8)))
    report_delay = rng.randint(2, 11) if suspicious else rng.randint(0, 3)
    days_since_policy_start = rng.randint(1, 45) if suspicious else rng.randint(45, 820)
    days_until_policy_end = rng.randint(1, 12) if critical else rng.randint(35, 720)
    incidents_12m = rng.randint(2, 5) if suspicious else rng.randint(0, 2)
    incidents_18m = max(incidents_12m, rng.randint(2, 6) if suspicious else rng.randint(0, 2))
    vehicle_incidents_18m = rng.randint(1, 4) if suspicious else rng.randint(0, 1)
    driver_incidents_18m = rng.randint(1, 4) if suspicious else rng.randint(0, 1)
    prior_rc_claims = rng.randint(3, 5) if suspicious and "Responsabilidad" in coverage else rng.randint(0, 1)
    provider_observed_cases = rng.randint(3, 9) if suspicious else rng.randint(0, 2)
    provider_watchlist = critical or (suspicious and rng.random() > 0.8)
    documents_inconsistent = critical or (suspicious and rng.random() > 0.55)
    missing_critical_document = suspicious and rng.random() > 0.5
    narrative_similarity = round(rng.uniform(0.72, 0.97), 2) if suspicious else round(rng.uniform(0.05, 0.68), 2)
    accident_dynamics = "illogical" if critical else choose(rng, ["normal", "frontal", "posterior", "multiple", "volcadura"])
    unidentified_third_party = claim_type == "collision" and suspicious and rng.random() > 0.4
    night_claim = rng.random() > (0.25 if suspicious else 0.78)
    channel = choose(rng, ["callcenter", "web", "broker"] if suspicious else ["app", "broker", "web"])
    vehicle_year = rng.randint(1998, 2010) if suspicious else rng.randint(2006, 2025)
    vehicle_age = datetime.now(timezone.utc).year - vehicle_year
    customer_score = rng.randint(420, 590) if suspicious else rng.randint(620, 840)
    days_ago = rng.randint(0, 180)
    occurred_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    submitted_at = occurred_at + timedelta(days=report_delay)

    logit = -2.25
    amount_ratio = claim_amount / max(estimated_amount, 1)
    if amount_ratio >= 1.7:
        logit += 1.25
    elif amount_ratio >= 1.35:
        logit += 0.7
    if days_since_policy_start <= 10:
        logit += 1.0
    elif days_since_policy_start <= 30:
        logit += 0.55
    if days_until_policy_end <= 10:
        logit += 0.55
    if report_delay > 7:
        logit += 0.65
    if claim_type == "theft" and report_delay > 2:
        logit += 0.95
    if incidents_18m >= 3:
        logit += 0.9
    if vehicle_incidents_18m >= 3:
        logit += 0.65
    if driver_incidents_18m >= 3:
        logit += 0.65
    if prior_rc_claims > 2:
        logit += 0.55
    if provider_watchlist:
        logit += 1.2
    elif provider_observed_cases > 2:
        logit += 0.6
    if documents_inconsistent:
        logit += 1.25
    if missing_critical_document:
        logit += 0.55
    if narrative_similarity >= 0.85:
        logit += 0.85
    if unidentified_third_party:
        logit += 0.4
    if accident_dynamics == "illogical":
        logit += 0.75
    if claim_amount / max(sum_insured, 1) >= 0.95:
        logit += 0.5
    if vehicle_age > 15 and claim_amount > 14000:
        logit += 0.35
    logit += rng.uniform(-0.65, 0.65)

    fraud_probability_seed = sigmoid(logit)
    fraud_label = int(fraud_probability_seed >= 0.58)
    if rng.random() < 0.07:
        fraud_label = 1 - fraud_label

    return {
        "claim_id": f"CLM-{index + 1:05d}",
        "policy_id": f"POL-{10000 + ((index * 17) % 45000)}",
        "insured_id": f"CUST-{400 + (index % 7)}" if suspicious else f"CUST-{1000 + ((index * 13) % 900)}",
        "vehicle_id": f"VEH-{700 + (index % 9)}" if suspicious else f"VEH-{2000 + ((index * 29) % 1200)}",
        "driver_id": f"DRV-{300 + (index % 5)}" if suspicious else f"DRV-{1000 + ((index * 23) % 900)}",
        "provider_id": f"PROV-{20 + (index % 6)}" if suspicious else f"PROV-{100 + ((index * 11) % 80)}",
        "line_of_business": "vehicles",
        "coverage": coverage,
        "claim_type": claim_type,
        "channel": channel,
        "city": city,
        "branch": branch,
        "vehicle_year": vehicle_year,
        "vehicle_age": vehicle_age,
        "claim_amount": claim_amount,
        "estimated_damage_amount": estimated_amount,
        "paid_amount": 0 if fraud_label else int(claim_amount * rng.uniform(0.55, 0.9)),
        "claim_status": "Reserva" if fraud_label else choose(rng, ["Pago Parcial", "Liquidado", "Reserva"]),
        "sum_insured": sum_insured,
        "deductible": rng.randint(250, 1100),
        "incidents_last_12_months": incidents_12m,
        "incidents_last_18_months": incidents_18m,
        "vehicle_incidents_last_18_months": vehicle_incidents_18m,
        "driver_incidents_last_18_months": driver_incidents_18m,
        "prior_rc_claims": prior_rc_claims,
        "days_since_policy_start": days_since_policy_start,
        "days_until_policy_end": days_until_policy_end,
        "days_between_occurrence_report": report_delay,
        "occurred_at": occurred_at.isoformat(),
        "submitted_at": submitted_at.isoformat(),
        "is_night_claim": int(night_claim),
        "documents_complete": int(not missing_critical_document),
        "missing_critical_document": int(missing_critical_document),
        "documents_inconsistent": int(documents_inconsistent),
        "beneficiary_type": choose(rng, ["Taller", "Clinica", "Perito", "Asegurado"]),
        "provider_observed_cases": provider_observed_cases,
        "provider_watchlist": int(provider_watchlist),
        "accident_dynamics": accident_dynamics,
        "unidentified_third_party": int(unidentified_third_party),
        "narrative_similarity_max": narrative_similarity,
        "narrative_group": f"NARR-{index % 6}" if suspicious else f"NARR-{100 + index}",
        "customer_segment": choose(rng, ["Retail", "Pyme", "Preferente"]),
        "customer_tenure_months": rng.randint(1, 18) if suspicious else rng.randint(18, 90),
        "customer_policies_count": rng.randint(1, 2) if suspicious else rng.randint(1, 5),
        "customer_delinquent": int(suspicious and rng.random() > 0.7),
        "customer_score_simulated": customer_score,
        "report_narrative": (
            "Reclamo con danos altos, documentos por validar y patron similar a casos observados."
            if fraud_label
            else "Choque menor reportado por el asegurado con soporte fotografico inicial."
        ),
        "fraud_label": fraud_label,
    }


def generate(output: Path, rows: int, seed: int) -> None:
    rng = random.Random(seed)
    output.parent.mkdir(parents=True, exist_ok=True)
    records = [build_row(index, rng) for index in range(rows)]
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic insurance claims for ML training.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--rows", type=int, default=800)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args()
    generate(args.output, args.rows, args.seed)
    print(f"Generated {args.rows} rows at {args.output}")


if __name__ == "__main__":
    main()

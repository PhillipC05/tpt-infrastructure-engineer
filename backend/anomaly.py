"""
Cost Anomaly Detection Engine
Statistical Z-score approach — no AI required.
AI enrichment (narrative explanation) activates when AI_ENABLED=true.
"""
import math
import os
from typing import Dict, List, Optional


AI_ENABLED = os.getenv("AI_ENABLED", "false").lower() == "true"


class AnomalyEngine:
    """
    Compares line-item unit rates against a historical baseline
    and flags items that deviate beyond a configurable Z-score threshold.

    History is stored in-memory per session. In production, persist
    baseline_history to the database for cross-session comparisons.
    """

    # Seed baselines per item type (NZD/unit, NZ market mid-2026)
    DEFAULT_BASELINES: Dict[str, Dict] = {
        "conc_20mpa":         {"mean": 320,  "std": 28,   "unit": "m³"},
        "conc_25mpa":         {"mean": 345,  "std": 30,   "unit": "m³"},
        "conc_30mpa":         {"mean": 375,  "std": 33,   "unit": "m³"},
        "steel_rebar_16mm":   {"mean": 3.20, "std": 0.40, "unit": "kg"},
        "timber_pine_rg15":   {"mean": 1850, "std": 180,  "unit": "m³"},
        "aggregate_gap20":    {"mean": 42,   "std": 5,    "unit": "t"},
        "labour_civil_foreman":    {"mean": 95,  "std": 10,  "unit": "hr"},
        "labour_civil_operator":   {"mean": 75,  "std": 8,   "unit": "hr"},
        "labour_civil_labourer":   {"mean": 48,  "std": 6,   "unit": "hr"},
        "labour_concrete_finisher":{"mean": 72,  "std": 8,   "unit": "hr"},
        "plant_excavator_20t": {"mean": 185, "std": 20,   "unit": "hr"},
        "plant_dumper_6t":     {"mean": 95,  "std": 12,   "unit": "hr"},
        "plant_roller_10t":    {"mean": 85,  "std": 10,   "unit": "hr"},
    }

    def __init__(self, z_threshold: float = 2.0):
        self.z_threshold = z_threshold
        self.baselines: Dict[str, Dict] = dict(self.DEFAULT_BASELINES)
        # session history: {item_id: [rate1, rate2, ...]}
        self.history: Dict[str, List[float]] = {}

    def record_rates(self, rates: Dict[str, float]) -> None:
        """Feed observed unit rates into the running history."""
        for item_id, rate in rates.items():
            self.history.setdefault(item_id, []).append(rate)
            self._update_baseline(item_id)

    def _update_baseline(self, item_id: str) -> None:
        """Update running mean/std from observed history (Welford online algorithm)."""
        obs = self.history.get(item_id, [])
        if len(obs) < 3:
            return  # not enough data to override seed
        n = len(obs)
        mean = sum(obs) / n
        variance = sum((x - mean) ** 2 for x in obs) / (n - 1)
        std = math.sqrt(variance) if variance > 0 else 1.0
        self.baselines[item_id] = {
            **self.baselines.get(item_id, {}),
            "mean": mean,
            "std": std,
            "n": n,
        }

    def analyse(self, line_items: Dict[str, float]) -> Dict:
        """
        Analyse a dict of {item_id: unit_rate} and return anomaly flags.
        """
        flags = []
        clean = []

        for item_id, rate in line_items.items():
            baseline = self.baselines.get(item_id)
            if not baseline:
                clean.append({"item_id": item_id, "rate": rate, "status": "no_baseline"})
                continue

            mean = baseline["mean"]
            std = baseline["std"] or 1.0
            z = (rate - mean) / std
            pct_diff = round((rate - mean) / mean * 100, 1)

            entry = {
                "item_id": item_id,
                "rate": rate,
                "baseline_mean": round(mean, 2),
                "baseline_std": round(std, 2),
                "z_score": round(z, 2),
                "pct_diff": pct_diff,
                "unit": baseline.get("unit", ""),
                "direction": "high" if z > 0 else "low",
                "status": "anomaly" if abs(z) >= self.z_threshold else "normal",
                "message": self._message(item_id, rate, mean, pct_diff, z),
            }

            if abs(z) >= self.z_threshold:
                flags.append(entry)
            else:
                clean.append(entry)

        anomaly_count = len(flags)
        return {
            "total_items": len(line_items),
            "anomaly_count": anomaly_count,
            "z_threshold": self.z_threshold,
            "anomalies": sorted(flags, key=lambda x: abs(x["z_score"]), reverse=True),
            "normal_items": clean,
            "summary": self._summary(anomaly_count, len(line_items)),
            "ai_insights": None,  # populated only when AI_ENABLED=true
        }

    def _message(self, item_id: str, rate: float, mean: float,
                 pct_diff: float, z: float) -> str:
        direction = "above" if z > 0 else "below"
        return (
            f"{item_id.replace('_', ' ').title()} rate of ${rate:.2f} is "
            f"{abs(pct_diff):.0f}% {direction} the historical average "
            f"(${mean:.2f}), Z={z:+.1f}σ."
        )

    def _summary(self, anomaly_count: int, total: int) -> str:
        if anomaly_count == 0:
            return f"All {total} line items are within normal range."
        return (
            f"{anomaly_count} of {total} items flagged as potential anomalies "
            f"(>{self.z_threshold}σ from historical rates). Review before submission."
        )


anomaly_engine = AnomalyEngine()

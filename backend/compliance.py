"""
AS/NZS Compliance Rule Engine
Validates design parameters against built-in engineering standards.
No AI required — all rules are deterministic.
"""
from typing import Dict, List, Any
from enum import Enum


class Severity(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"


class CheckResult:
    def __init__(self, code: str, name: str, standard: str,
                 severity: Severity, message: str,
                 value: Any = None, limit: Any = None):
        self.code = code
        self.name = name
        self.standard = standard
        self.severity = severity
        self.message = message
        self.value = value
        self.limit = limit

    def to_dict(self) -> Dict:
        return {
            "code": self.code,
            "name": self.name,
            "standard": self.standard,
            "severity": self.severity.value,
            "message": self.message,
            "value": self.value,
            "limit": self.limit,
        }


class ComplianceEngine:
    """
    Check design parameters against AS/NZS standards.
    Add new design_type entries to extend coverage.
    """

    def check(self, design_type: str, params: Dict[str, Any]) -> Dict:
        checkers = {
            "retaining_wall": self._check_retaining_wall,
            "strip_foundation": self._check_strip_foundation,
            "box_culvert": self._check_box_culvert,
            "stormwater_pipe": self._check_stormwater_pipe,
        }
        fn = checkers.get(design_type)
        if not fn:
            return {"error": f"No compliance rules for design type '{design_type}'"}

        results: List[CheckResult] = fn(params)
        passed = sum(1 for r in results if r.severity == Severity.PASS)
        warnings = sum(1 for r in results if r.severity == Severity.WARNING)
        failures = sum(1 for r in results if r.severity == Severity.FAIL)
        score = round(100 * passed / len(results)) if results else 0

        return {
            "design_type": design_type,
            "total_checks": len(results),
            "passed": passed,
            "warnings": warnings,
            "failures": failures,
            "compliance_score": score,
            "overall": "fail" if failures else ("warning" if warnings else "pass"),
            "results": [r.to_dict() for r in results],
        }

    # ── Retaining Walls (AS 4678-2002) ──────────────────────────────────────

    def _check_retaining_wall(self, p: Dict) -> List[CheckResult]:
        results = []
        height = float(p.get("height", 0))
        embedment = float(p.get("embedment_depth", height * 0.3))
        has_drainage = bool(p.get("drainage_layer", True))
        surcharge = float(p.get("surcharge_kpa", 5.0))
        ot_ratio = float(p.get("overturning_ratio", 1.5))
        slide_ratio = float(p.get("sliding_ratio", 1.5))
        engineer_reviewed = bool(p.get("engineer_reviewed", height <= 1.5))

        results.append(CheckResult(
            "AS4678-E1", "Embedment depth", "AS 4678-2002 §4.3",
            Severity.PASS if embedment >= height * 0.3 else Severity.FAIL,
            f"Embedment {embedment:.2f} m {'≥' if embedment >= height * 0.3 else '<'} required {height * 0.3:.2f} m (30% of height)",
            value=round(embedment, 2), limit=round(height * 0.3, 2)
        ))

        results.append(CheckResult(
            "AS4678-D1", "Drainage layer", "AS 4678-2002 §5.2",
            Severity.PASS if has_drainage else Severity.FAIL,
            "Drainage layer behind wall is mandatory" if not has_drainage else "Drainage layer present",
            value=has_drainage, limit=True
        ))

        results.append(CheckResult(
            "AS4678-S1", "Minimum surcharge", "AS 4678-2002 §3.4",
            Severity.PASS if surcharge >= 5.0 else Severity.WARNING,
            f"Surcharge {surcharge} kPa {'≥' if surcharge >= 5.0 else '<'} 5 kPa residential minimum",
            value=surcharge, limit=5.0
        ))

        results.append(CheckResult(
            "AS4678-OT1", "Overturning stability", "AS 4678-2002 §6.2",
            Severity.PASS if ot_ratio >= 1.5 else Severity.FAIL,
            f"Overturning ratio {ot_ratio:.2f} {'≥' if ot_ratio >= 1.5 else '<'} 1.5 minimum",
            value=ot_ratio, limit=1.5
        ))

        results.append(CheckResult(
            "AS4678-SL1", "Sliding stability", "AS 4678-2002 §6.3",
            Severity.PASS if slide_ratio >= 1.5 else Severity.FAIL,
            f"Sliding ratio {slide_ratio:.2f} {'≥' if slide_ratio >= 1.5 else '<'} 1.5 minimum",
            value=slide_ratio, limit=1.5
        ))

        results.append(CheckResult(
            "AS4678-EN1", "Engineer sign-off", "AS 4678-2002 §1.2",
            Severity.PASS if engineer_reviewed else (Severity.FAIL if height > 1.5 else Severity.WARNING),
            f"Walls > 1.5 m must be signed off by a chartered engineer. Height = {height} m.",
            value=engineer_reviewed, limit=height <= 1.5
        ))

        return results

    # ── Strip Foundations (AS 2870-2011) ─────────────────────────────────────

    def _check_strip_foundation(self, p: Dict) -> List[CheckResult]:
        results = []
        width = float(p.get("width", 0.6))
        depth = float(p.get("depth", 0.8))
        wall_thickness = float(p.get("wall_thickness", 0.2))
        bearing_capacity = float(p.get("bearing_capacity_kpa", 100.0))
        applied_load = float(p.get("load_kn_per_m", 100.0))
        actual_bearing = applied_load / width if width else 0

        results.append(CheckResult(
            "AS2870-W1", "Minimum footing width", "AS 2870-2011 §4.3",
            Severity.PASS if width >= wall_thickness * 3 else Severity.FAIL,
            f"Width {width} m {'≥' if width >= wall_thickness * 3 else '<'} 3× wall thickness ({wall_thickness * 3:.2f} m)",
            value=width, limit=round(wall_thickness * 3, 2)
        ))

        results.append(CheckResult(
            "AS2870-D1", "Minimum footing depth", "AS 2870-2011 §4.4",
            Severity.PASS if depth >= 0.3 else Severity.FAIL,
            f"Depth {depth} m {'≥' if depth >= 0.3 else '<'} 300 mm minimum",
            value=depth, limit=0.3
        ))

        results.append(CheckResult(
            "AS2870-B1", "Bearing capacity", "AS 2870-2011 §5.2",
            Severity.PASS if actual_bearing <= bearing_capacity else Severity.FAIL,
            f"Actual bearing {actual_bearing:.1f} kPa {'≤' if actual_bearing <= bearing_capacity else '>'} allowable {bearing_capacity} kPa",
            value=round(actual_bearing, 1), limit=bearing_capacity
        ))

        results.append(CheckResult(
            "AS2870-FR1", "Frost depth (NZ)", "NZS 3604:2011 §6.2",
            Severity.PASS if depth >= 0.45 else Severity.WARNING,
            f"Depth {depth} m {'≥' if depth >= 0.45 else '<'} 450 mm frost-free minimum (NZ cold regions)",
            value=depth, limit=0.45
        ))

        return results

    # ── Box Culverts (AS/NZS 1597) ──────────────────────────────────────────

    def _check_box_culvert(self, p: Dict) -> List[CheckResult]:
        results = []
        span = float(p.get("span", 2.4))
        height_internal = float(p.get("height", 1.8))
        cover = float(p.get("cover", 1.0))
        design_flow = float(p.get("design_flow_m3s", 0))
        headroom = float(p.get("headroom_ratio", 0.75))

        results.append(CheckResult(
            "AS1597-C1", "Minimum cover", "AS/NZS 1597.2 §4.2",
            Severity.PASS if cover >= 0.3 else Severity.FAIL,
            f"Fill cover {cover} m {'≥' if cover >= 0.3 else '<'} 300 mm minimum",
            value=cover, limit=0.3
        ))

        results.append(CheckResult(
            "AS1597-H1", "Headroom ratio", "AS/NZS 1597.2 §6.3",
            Severity.PASS if headroom <= 0.75 else Severity.WARNING,
            f"Design flow occupies {headroom*100:.0f}% of capacity (recommended ≤ 75%)",
            value=round(headroom, 2), limit=0.75
        ))

        results.append(CheckResult(
            "AS1597-A1", "Minimum aperture (maintenance)", "AS/NZS 1597.2 §3.1",
            Severity.PASS if span >= 0.6 and height_internal >= 0.6 else Severity.WARNING,
            f"Span {span} m × height {height_internal} m — apertures < 600 mm are not maintainable",
            value=f"{span}×{height_internal}", limit="0.6×0.6"
        ))

        return results

    # ── Stormwater Pipes (AS/NZS 3500.3) ────────────────────────────────────

    def _check_stormwater_pipe(self, p: Dict) -> List[CheckResult]:
        results = []
        diameter_mm = float(p.get("diameter_mm", 300))
        slope_percent = float(p.get("slope_percent", 1.0))
        depth_m = float(p.get("depth_m", 0.6))

        min_slope = 100 / diameter_mm  # % — approximate self-cleansing
        results.append(CheckResult(
            "AS3500-S1", "Self-cleansing slope", "AS/NZS 3500.3 §8.4",
            Severity.PASS if slope_percent >= min_slope else Severity.FAIL,
            f"Slope {slope_percent:.2f}% {'≥' if slope_percent >= min_slope else '<'} {min_slope:.2f}% minimum for DN{int(diameter_mm)}",
            value=slope_percent, limit=round(min_slope, 2)
        ))

        results.append(CheckResult(
            "AS3500-D1", "Minimum cover depth", "AS/NZS 3500.3 §10.2",
            Severity.PASS if depth_m >= 0.45 else Severity.WARNING,
            f"Cover depth {depth_m} m {'≥' if depth_m >= 0.45 else '<'} 450 mm minimum",
            value=depth_m, limit=0.45
        ))

        results.append(CheckResult(
            "AS3500-DI1", "Minimum pipe diameter", "AS/NZS 3500.3 §5.1",
            Severity.PASS if diameter_mm >= 100 else Severity.FAIL,
            f"Diameter {int(diameter_mm)} mm {'≥' if diameter_mm >= 100 else '<'} DN100 minimum",
            value=int(diameter_mm), limit=100
        ))

        return results


compliance_engine = ComplianceEngine()

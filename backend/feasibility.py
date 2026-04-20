from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import math


@dataclass
class FeasibilityAssessment:
    overall_score: float
    geotechnical_risk: float
    environmental_impact: float
    hydrological_risk: float
    traffic_impact: float
    utility_impact: float
    accessibility_score: float
    compliance_status: bool
    land_rights_status: bool
    recommendations: List[str]


@dataclass
class RiskItem:
    id: str
    name: str
    category: str
    probability: float
    impact_cost: float
    impact_schedule: int
    mitigation_measure: str
    risk_score: float = 0.0


class FeasibilityEngine:
    @staticmethod
    def assess_geotechnical(site_conditions: Dict) -> Dict:
        """
        Assess geotechnical feasibility based on soil data
        """
        soil_type = site_conditions.get('soil_type', 'unknown')
        groundwater_level = site_conditions.get('groundwater_level', 10.0)
        bearing_capacity = site_conditions.get('bearing_capacity', 150.0)
        
        risk_levels = {
            'rock': 0.05,
            'gravel': 0.15,
            'sand': 0.30,
            'clay': 0.55,
            'silt': 0.70,
            'peat': 0.90,
            'unknown': 0.50
        }
        
        base_risk = risk_levels.get(soil_type, 0.5)
        
        if groundwater_level < 2.0:
            base_risk += 0.25
        if bearing_capacity < 100:
            base_risk += 0.2
        
        return {
            "soil_type": soil_type,
            "bearing_capacity_kpa": bearing_capacity,
            "groundwater_depth_m": groundwater_level,
            "geotechnical_risk": round(min(base_risk, 1.0), 2),
            "required_foundation_depth": max(1.5, 3.0 - (groundwater_level * 0.3))
        }

    @staticmethod
    def calculate_hydrological(site_parameters: Dict) -> Dict:
        """
        Hydrological and flood risk calculation
        """
        catchment_area = site_parameters.get('catchment_area', 50.0)
        rainfall_intensity = site_parameters.get('rainfall_intensity', 120.0)
        runoff_coefficient = site_parameters.get('runoff_coefficient', 0.6)
        
        # Rational method peak flood calculation
        peak_flow = (catchment_area * rainfall_intensity * runoff_coefficient) / 360
        
        flood_zones = {
            0.5: "Low Risk",
            1.0: "Moderate Risk",
            2.0: "High Risk",
            5.0: "Extreme Risk"
        }
        
        return {
            "peak_flow_m3s": round(peak_flow, 2),
            "estimated_flood_depth_m": round(peak_flow / 12, 2),
            "flood_return_period_years": int(100 / (peak_flow * 2)),
            "required_drainage_capacity_lps": round(peak_flow * 1000),
            "hydrological_risk": round(min(peak_flow / 10, 1.0), 2)
        }

    @staticmethod
    def assess_traffic_impact(proposal: Dict) -> Dict:
        """
        Traffic impact assessment calculations
        """
        existing_traffic = proposal.get('existing_aadt', 5000)
        generated_traffic = proposal.get('generated_trips', 250)
        intersection_capacity = proposal.get('intersection_capacity', 1200)
        
        level_of_service = (existing_traffic + generated_traffic * 1.2) / intersection_capacity
        
        return {
            "existing_daily_traffic": existing_traffic,
            "generated_daily_trips": generated_traffic,
            "intersection_level_of_service": round(level_of_service, 2),
            "traffic_impact_score": round(min(level_of_service, 1.0), 2),
            "required_road_upgrades": level_of_service > 0.85
        }

    @staticmethod
    def perform_full_feasibility(site_data: Dict) -> FeasibilityAssessment:
        """
        Complete multi-disciplinary feasibility assessment
        """
        geo = FeasibilityEngine.assess_geotechnical(site_data)
        hydro = FeasibilityEngine.calculate_hydrological(site_data)
        traffic = FeasibilityEngine.assess_traffic_impact(site_data)
        
        recommendations = []
        
        if geo['geotechnical_risk'] > 0.5:
            recommendations.append("Specialised geotechnical investigation recommended")
        if hydro['hydrological_risk'] > 0.4:
            recommendations.append("Flood mitigation measures required")
        if traffic['traffic_impact_score'] > 0.7:
            recommendations.append("Intersection upgrade required prior to construction")
        
        overall_score = 1.0 - ((
            geo['geotechnical_risk'] * 0.25 +
            hydro['hydrological_risk'] * 0.25 +
            traffic['traffic_impact_score'] * 0.2 +
            site_data.get('utility_relocation_cost_factor', 0.1) * 0.15 +
            site_data.get('easement_requirements', 0.1) * 0.15
        ))
        
        return FeasibilityAssessment(
            overall_score=round(max(0.0, overall_score), 2),
            geotechnical_risk=geo['geotechnical_risk'],
            environmental_impact=site_data.get('environmental_impact', 0.3),
            hydrological_risk=hydro['hydrological_risk'],
            traffic_impact=traffic['traffic_impact_score'],
            utility_impact=site_data.get('utility_relocation_cost_factor', 0.1),
            accessibility_score=round(1.0 - site_data.get('access_restrictions', 0.2), 2),
            compliance_status=site_data.get('zoning_compliant', True),
            land_rights_status=site_data.get('clear_title', True),
            recommendations=recommendations
        )


class RiskAnalysisEngine:
    @staticmethod
    def calculate_risk_register(risks: List[RiskItem]) -> List[RiskItem]:
        """
        Calculate risk scores and sort risk register
        """
        for risk in risks:
            risk.risk_score = risk.probability * risk.impact_cost
        
        # Sort by risk score descending
        return sorted(risks, key=lambda x: x.risk_score, reverse=True)

    @staticmethod
    def monte_carlo_cost_risk(base_cost: float, risk_variables: List[Dict], iterations: int = 1000) -> Dict:
        """
        Monte Carlo simulation for cost risk analysis
        """
        import random
        
        cost_outcomes = []
        
        for _ in range(iterations):
            total_variation = 1.0
            for variable in risk_variables:
                mean = variable.get('mean', 1.0)
                std_dev = variable.get('std_dev', 0.1)
                total_variation *= random.normalvariate(mean, std_dev)
            
            cost_outcomes.append(base_cost * total_variation)
        
        cost_outcomes.sort()
        
        return {
            "base_cost": base_cost,
            "minimum_cost": round(cost_outcomes[0], 2),
            "maximum_cost": round(cost_outcomes[-1], 2),
            "expected_cost": round(sum(cost_outcomes) / len(cost_outcomes), 2),
            "p50_cost": round(cost_outcomes[int(iterations * 0.5)], 2),
            "p80_cost": round(cost_outcomes[int(iterations * 0.8)], 2),
            "p95_cost": round(cost_outcomes[int(iterations * 0.95)], 2),
            "cost_uncertainty_pct": round(((cost_outcomes[-1] - cost_outcomes[0]) / base_cost) * 100, 1)
        }

    @staticmethod
    def monte_carlo_schedule_risk(base_duration_days: int, task_risks: List[Dict], iterations: int = 1000) -> Dict:
        """
        Monte Carlo simulation for schedule risk analysis
        """
        import random
        
        duration_outcomes = []
        
        for _ in range(iterations):
            total_delay = 0
            for risk in task_risks:
                if random.random() < risk.get('probability', 0.2):
                    total_delay += risk.get('delay_days', 5)
            
            duration_outcomes.append(base_duration_days + total_delay)
        
        duration_outcomes.sort()
        
        return {
            "base_duration_days": base_duration_days,
            "minimum_duration": int(min(duration_outcomes)),
            "maximum_duration": int(max(duration_outcomes)),
            "expected_duration": int(sum(duration_outcomes) / len(duration_outcomes)),
            "p50_duration": int(duration_outcomes[int(iterations * 0.5)]),
            "p80_duration": int(duration_outcomes[int(iterations * 0.8)]),
            "p95_duration": int(duration_outcomes[int(iterations * 0.95)]),
            "schedule_contigency_days": int(duration_outcomes[int(iterations * 0.8)] - base_duration_days)
        }

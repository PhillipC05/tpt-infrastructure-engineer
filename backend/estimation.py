from typing import Dict, List, Tuple
from pydantic import BaseModel
from materials import MaterialsEngine
from trades import TradesEngine


class CostEstimate(BaseModel):
    total_materials: float
    total_labour: float
    total_plant: float
    subtotal: float
    overhead: float
    profit_margin: float
    contingency: float
    total_cost: float
    carbon_footprint: float
    breakdown: Dict[str, float]


class EstimationEngine:
    OVERHEAD_RATE = 0.12
    PROFIT_MARGIN = 0.10
    CONTINGENCY_RATE = 0.05

    @staticmethod
    def calculate_retaining_wall_estimate(
        wall_height: float,
        wall_length: float,
        materials_quantity: Dict[str, float],
        labour_hours: Dict[str, float],
        plant_hours: Dict[str, float]
    ) -> CostEstimate:
        """
        Calculate complete cost estimate for retaining wall construction
        """
        total_materials = 0.0
        total_labour = 0.0
        total_plant = 0.0
        total_carbon = 0.0
        breakdown = {}

        # Calculate Materials Cost
        for material_id, quantity in materials_quantity.items():
            cost = MaterialsEngine.calculate_material_cost(material_id, quantity)
            carbon = MaterialsEngine.calculate_carbon_footprint(material_id, quantity)
            total_materials += cost
            total_carbon += carbon
            breakdown[f"material_{material_id}"] = cost

        # Calculate Labour Cost
        for rate_id, hours in labour_hours.items():
            cost = TradesEngine.calculate_labour_cost(rate_id, hours)
            total_labour += cost
            breakdown[f"labour_{rate_id}"] = cost

        # Calculate Plant Cost
        plant_rates = {"plant_excavator_20t": 185, "plant_dumper_6t": 95, "plant_roller_10t": 85}
        for plant_id, hours in plant_hours.items():
            cost = plant_rates.get(plant_id, 0) * hours
            total_plant += cost
            breakdown[f"plant_{plant_id}"] = cost

        subtotal = total_materials + total_labour + total_plant
        overhead = subtotal * EstimationEngine.OVERHEAD_RATE
        profit_margin = (subtotal + overhead) * EstimationEngine.PROFIT_MARGIN
        contingency = (subtotal + overhead + profit_margin) * EstimationEngine.CONTINGENCY_RATE
        total_cost = subtotal + overhead + profit_margin + contingency

        return CostEstimate(
            total_materials=round(total_materials, 2),
            total_labour=round(total_labour, 2),
            total_plant=round(total_plant, 2),
            subtotal=round(subtotal, 2),
            overhead=round(overhead, 2),
            profit_margin=round(profit_margin, 2),
            contingency=round(contingency, 2),
            total_cost=round(total_cost, 2),
            carbon_footprint=round(total_carbon, 3),
            breakdown=breakdown
        )

    @staticmethod
    def calculate_quantity_takeoff(design_parameters: Dict) -> Tuple[Dict, Dict, Dict]:
        """
        Automatic quantity takeoff from design parameters
        """
        height = design_parameters.get('wall_height', 3.0)
        length = design_parameters.get('wall_length', 20.0)

        materials = {
            "conc_25mpa": height * length * 0.4,
            "steel_rebar_16mm": length * 22,
            "aggregate_gap20": length * 1.8
        }

        labour = {
            "labour_civil_foreman": length * 1.2,
            "labour_civil_operator": length * 0.8,
            "labour_concrete_finisher": length * 1.0,
            "labour_civil_labourer": length * 2.5
        }

        plant = {
            "plant_excavator_20t": length * 0.3,
            "plant_dumper_6t": length * 0.2
        }

        return materials, labour, plant

    @staticmethod
    def calculate_cost_escalation(base_cost: float, escalation_rate: float, months: int) -> float:
        """
        Calculate cost escalation over time period
        Formula: Future Cost = Base Cost * (1 + r)^n
        """
        return round(base_cost * (1 + escalation_rate) ** months, 2)

    @staticmethod
    def calculate_unit_rate_analysis(material_id: str, quantity: float) -> Dict:
        """
        Detailed unit rate breakdown for individual items
        """
        material_cost = MaterialsEngine.calculate_material_cost(material_id, 1.0)
        waste_factor = MaterialsEngine.get_material_waste_factor(material_id)
        labour_rate = TradesEngine.get_installation_labour_rate(material_id)
        
        unit_rate = material_cost * (1 + waste_factor) + labour_rate
        
        return {
            "material_id": material_id,
            "material_unit_cost": round(material_cost, 2),
            "waste_factor": round(waste_factor, 3),
            "labour_unit_cost": round(labour_rate, 2),
            "total_unit_rate": round(unit_rate, 2),
            "total_cost": round(unit_rate * quantity, 2)
        }

    @staticmethod
    def compare_design_estimates(designs: List[Dict]) -> List[Dict]:
        """
        Compare cost estimates across multiple design alternatives
        """
        results = []
        
        for design in designs:
            materials, labour, plant = EstimationEngine.calculate_quantity_takeoff(design)
            estimate = EstimationEngine.calculate_retaining_wall_estimate(
                design.get('wall_height', 3.0),
                design.get('wall_length', 20.0),
                materials,
                labour,
                plant
            )
            
            results.append({
                "design_id": design.get('id'),
                "design_name": design.get('name'),
                "total_cost": estimate.total_cost,
                "total_materials": estimate.total_materials,
                "total_labour": estimate.total_labour,
                "carbon_footprint": estimate.carbon_footprint,
                "cost_per_m2": round(estimate.total_cost / (design.get('wall_height') * design.get('wall_length')), 2)
            })
        
        # Sort by total cost ascending
        return sorted(results, key=lambda x: x['total_cost'])

    @staticmethod
    def extract_measurements_from_drawing(drawing_geometry: Dict) -> Dict:
        """
        Extract automatic measurements from drawing geometry data
        """
        measurements = {
            "total_area": 0.0,
            "total_length": 0.0,
            "total_volume": 0.0,
            "wall_count": 0,
            "openings_count": 0
        }
        
        if 'elements' in drawing_geometry:
            for element in drawing_geometry['elements']:
                if element['type'] == 'wall':
                    measurements['wall_count'] += 1
                    measurements['total_length'] += element.get('length', 0)
                    measurements['total_area'] += element.get('length', 0) * element.get('height', 0)
                    measurements['total_volume'] += element.get('length', 0) * element.get('height', 0) * element.get('thickness', 0)
                elif element['type'] in ['door', 'window', 'opening']:
                    measurements['openings_count'] += 1
        
        return measurements

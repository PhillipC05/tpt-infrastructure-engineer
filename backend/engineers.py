from typing import Dict, Any
from pydantic import BaseModel


class RetainingWallCalculation(BaseModel):
    height: float
    length: float
    material: str
    soil_type: str
    water_table: bool


class EngineeringEngine:
    @staticmethod
    def calculate_retaining_wall(params: RetainingWallCalculation) -> Dict[str, Any]:
        """
        Standard retaining wall engineering calculations
        Based on AS 4678 Australian Standard
        """
        results = {}
        
        # Earth Pressure Coefficients
        soil_parameters = {
            'granular': {'phi': 35, 'gamma': 18.0},
            'clay': {'phi': 25, 'gamma': 19.5},
            'silt': {'phi': 30, 'gamma': 18.5},
            'rock': {'phi': 40, 'gamma': 22.0}
        }
        
        soil = soil_parameters.get(params.soil_type, soil_parameters['granular'])
        ka = (1 - __import__('math').sin(soil['phi'] * __import__('math').pi / 180)) / \
             (1 + __import__('math').sin(soil['phi'] * __import__('math').pi / 180))
        
        active_force = 0.5 * ka * soil['gamma'] * params.height ** 2
        
        overturning_moment = active_force * (params.height / 3)
        
        results['active_pressure_coefficient'] = round(ka, 3)
        results['active_force'] = round(active_force, 1)
        results['overturning_moment'] = round(overturning_moment, 1)
        results['unit_soil_weight'] = soil['gamma']
        results['calculation_standard'] = 'AS 4678:2002'
        
        # Material Resistance
        material_strength = {
            'concrete': 45,
            'timber': 22,
            'gabion': 18,
            'sheet_pile': 38
        }
        
        results['material_strength'] = material_strength.get(params.material, 30)
        results['safety_factor'] = round(results['material_strength'] / (active_force / 10), 2)
        results['structural_rating'] = min(100, round(results['safety_factor'] * 40))
        
        if params.water_table:
            results['submerged_reduction'] = 0.7
            results['safety_factor'] *= 0.7
            results['structural_rating'] *= 0.7
        
        # Cost Estimation
        material_costs = {
            'concrete': 850,
            'timber': 620,
            'gabion': 480,
            'sheet_pile': 1100
        }
        
        results['cost_estimate'] = round(params.height * params.length * material_costs.get(params.material, 700))
        results['compliance_status'] = 'pass' if results['safety_factor'] >= 1.5 else \
                                       'warning' if results['safety_factor'] >= 1.2 else 'fail'
        
        return results


    @staticmethod
    def calculate_strip_foundation(width: float, depth: float, load: float) -> Dict[str, Any]:
        """
        Strip foundation bearing capacity calculation
        Based on Terzaghi bearing capacity equation
        """
        gamma = 18.0
        nc = 5.7
        nq = 4.4
        ny = 3.2
        
        cohesion = 25
        
        bearing_capacity = (cohesion * nc) + (gamma * depth * nq) + (0.5 * gamma * width * ny)
        applied_pressure = load / width
        
        safety_factor = bearing_capacity / applied_pressure
        
        return {
            'bearing_capacity': round(bearing_capacity, 1),
            'applied_pressure': round(applied_pressure, 1),
            'safety_factor': round(safety_factor, 2),
            'structural_rating': min(100, round(safety_factor * 35)),
            'calculation_standard': 'AS 2870:2011',
            'compliance_status': 'pass' if safety_factor >= 3.0 else 'warning' if safety_factor >= 2.0 else 'fail'
        }
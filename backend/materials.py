from typing import Dict, Any, List
from pydantic import BaseModel
from enum import Enum


class MaterialCategory(str, Enum):
    CONCRETE = "concrete"
    STEEL = "steel"
    TIMBER = "timber"
    MASONRY = "masonry"
    AGGREGATES = "aggregates"
    GEOSYNTHETICS = "geosynthetics"
    DRAINAGE = "drainage"


class Material(BaseModel):
    id: str
    name: str
    category: MaterialCategory
    properties: Dict[str, Any]
    unit_cost: float
    density: float
    strength: float
    carbon_footprint: float
    standards: List[str]
    supplier_ids: List[str]


MATERIAL_DATABASE: Dict[str, Material] = {
    "conc_20mpa": Material(
        id="conc_20mpa",
        name="Concrete 20 MPa",
        category=MaterialCategory.CONCRETE,
        properties={"compressive_strength": 20, "workability": "normal", "max_aggregate": 20},
        unit_cost=320.0,
        density=2400.0,
        strength=20.0,
        carbon_footprint=0.18,
        standards=["AS 1379", "NZS 3101"],
        supplier_ids=[]
    ),
    "conc_25mpa": Material(
        id="conc_25mpa",
        name="Concrete 25 MPa",
        category=MaterialCategory.CONCRETE,
        properties={"compressive_strength": 25, "workability": "normal", "max_aggregate": 20},
        unit_cost=345.0,
        density=2400.0,
        strength=25.0,
        carbon_footprint=0.19,
        standards=["AS 1379", "NZS 3101"],
        supplier_ids=[]
    ),
    "conc_30mpa": Material(
        id="conc_30mpa",
        name="Concrete 30 MPa",
        category=MaterialCategory.CONCRETE,
        properties={"compressive_strength": 30, "workability": "normal", "max_aggregate": 20},
        unit_cost=375.0,
        density=2400.0,
        strength=30.0,
        carbon_footprint=0.20,
        standards=["AS 1379", "NZS 3101"],
        supplier_ids=[]
    ),
    "steel_rebar_16mm": Material(
        id="steel_rebar_16mm",
        name="Reinforcing Steel 16mm",
        category=MaterialCategory.STEEL,
        properties={"diameter": 16, "grade": "500E", "yield_strength": 500},
        unit_cost=3.20,
        density=7850.0,
        strength=500.0,
        carbon_footprint=2.1,
        standards=["AS/NZS 4671"],
        supplier_ids=[]
    ),
    "timber_pine_rg15": Material(
        id="timber_pine_rg15",
        name="Pine Radiata RG15",
        category=MaterialCategory.TIMBER,
        properties={"grade": "RG15", "moisture_content": 15, "treatment": "H3"},
        unit_cost=1850.0,
        density=450.0,
        strength=15.0,
        carbon_footprint=-0.8,
        standards=["AS/NZS 1748"],
        supplier_ids=[]
    ),
    "aggregate_gap20": Material(
        id="aggregate_gap20",
        name="Gap 20 Basecourse",
        category=MaterialCategory.AGGREGATES,
        properties={"grading": "GP20", "cbr": 80, "maximum_size": 20},
        unit_cost=42.0,
        density=2000.0,
        strength=80.0,
        carbon_footprint=0.03,
        standards=["AS/NZS 2758"],
        supplier_ids=[]
    )
}


class MaterialsEngine:
    @staticmethod
    def get_material(material_id: str) -> Material:
        return MATERIAL_DATABASE.get(material_id)

    @staticmethod
    def get_by_category(category: MaterialCategory) -> List[Material]:
        return [m for m in MATERIAL_DATABASE.values() if m.category == category]

    @staticmethod
    def calculate_carbon_footprint(material_id: str, quantity: float) -> float:
        material = MATERIAL_DATABASE.get(material_id)
        return material.carbon_footprint * quantity if material else 0.0

    @staticmethod
    def calculate_material_cost(material_id: str, quantity: float) -> float:
        material = MATERIAL_DATABASE.get(material_id)
        return material.unit_cost * quantity if material else 0.0
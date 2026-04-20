from typing import Dict, Any, List
from pydantic import BaseModel
from enum import Enum


class TradeDiscipline(str, Enum):
    CIVIL = "civil"
    STRUCTURAL = "structural"
    EARTHWORKS = "earthworks"
    CONCRETE = "concrete"
    FORMWORK = "formwork"
    REINFORCING = "reinforcing"
    CARPENTRY = "carpentry"
    DRAINAGE = "drainage"
    ROADING = "roading"
    LANDSCAPING = "landscaping"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"


class LabourRate(BaseModel):
    id: str
    trade: TradeDiscipline
    classification: str
    hourly_rate: float
    daily_rate: float
    overtime_multiplier: float
    location: str
    effective_date: str


class PlantEquipment(BaseModel):
    id: str
    name: str
    category: str
    hourly_rate: float
    daily_rate: float
    operator_required: bool
    fuel_consumption: float


LABOUR_DATABASE: List[LabourRate] = [
    LabourRate(
        id="labour_civil_foreman",
        trade=TradeDiscipline.CIVIL,
        classification="Foreman",
        hourly_rate=95.0,
        daily_rate=760.0,
        overtime_multiplier=1.5,
        location="NZ",
        effective_date="2026-01-01"
    ),
    LabourRate(
        id="labour_civil_operator",
        trade=TradeDiscipline.CIVIL,
        classification="Plant Operator",
        hourly_rate=75.0,
        daily_rate=600.0,
        overtime_multiplier=1.5,
        location="NZ",
        effective_date="2026-01-01"
    ),
    LabourRate(
        id="labour_civil_labourer",
        trade=TradeDiscipline.CIVIL,
        classification="Labourer",
        hourly_rate=48.0,
        daily_rate=384.0,
        overtime_multiplier=1.5,
        location="NZ",
        effective_date="2026-01-01"
    ),
    LabourRate(
        id="labour_concrete_finisher",
        trade=TradeDiscipline.CONCRETE,
        classification="Concrete Finisher",
        hourly_rate=72.0,
        daily_rate=576.0,
        overtime_multiplier=1.5,
        location="NZ",
        effective_date="2026-01-01"
    ),
    LabourRate(
        id="labour_carpenter",
        trade=TradeDiscipline.CARPENTRY,
        classification="Carpenter",
        hourly_rate=68.0,
        daily_rate=544.0,
        overtime_multiplier=1.5,
        location="NZ",
        effective_date="2026-01-01"
    )
]

PLANT_DATABASE: List[PlantEquipment] = [
    PlantEquipment(
        id="plant_excavator_20t",
        name="20 Tonne Excavator",
        category="Earthmoving",
        hourly_rate=185.0,
        daily_rate=1480.0,
        operator_required=True,
        fuel_consumption=18.0
    ),
    PlantEquipment(
        id="plant_dumper_6t",
        name="6 Tonne Dumper Truck",
        category="Earthmoving",
        hourly_rate=95.0,
        daily_rate=760.0,
        operator_required=True,
        fuel_consumption=12.0
    ),
    PlantEquipment(
        id="plant_roller_10t",
        name="10 Tonne Smooth Drum Roller",
        category="Compaction",
        hourly_rate=85.0,
        daily_rate=680.0,
        operator_required=True,
        fuel_consumption=8.0
    )
]


class TradesEngine:
    @staticmethod
    def get_labour_rates(trade: TradeDiscipline) -> List[LabourRate]:
        return [rate for rate in LABOUR_DATABASE if rate.trade == trade]

    @staticmethod
    def get_plant_equipment(category: str = None) -> List[PlantEquipment]:
        if category:
            return [p for p in PLANT_DATABASE if p.category == category]
        return PLANT_DATABASE

    @staticmethod
    def calculate_labour_cost(rate_id: str, hours: float) -> float:
        rate = next((r for r in LABOUR_DATABASE if r.id == rate_id), None)
        return rate.hourly_rate * hours if rate else 0.0
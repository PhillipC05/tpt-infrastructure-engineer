"""
Demo seed script — run once from the backend/ directory:
    python seed.py

Creates: 1 organisation, 1 demo user, 4 projects, materials catalogue,
schedule tasks, estimate items, purchase orders, BOMs, reports, and notifications.
Safe to re-run: skips seeding if the demo user already exists.
"""
import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv()

from database import engine, SessionLocal
from models import (
    Base, Organisation, User, UserRole, Project, ProjectVersion,
    ProjectActivity, Material, ScheduleTask, EstimateItem,
    PurchaseOrder, BillOfMaterials, GeneratedReport, Notification,
)
from auth import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── Guard ────────────────────────────────────────────────────────────────────
if db.query(User).filter(User.email == "demo@tpt.local").first():
    print("Demo data already exists — skipping.")
    db.close()
    sys.exit(0)

# ── Organisation ─────────────────────────────────────────────────────────────
org = Organisation(
    id=uuid4(),
    name="Demo Organisation",
    business_number="123-456-789",
    address="1 Harbour Drive, Auckland 1010",
    country_code="NZ",
)
db.add(org)
db.flush()

# ── Demo user ─────────────────────────────────────────────────────────────────
demo_user = User(
    id=uuid4(),
    organisation_id=org.id,
    email="demo@tpt.local",
    hashed_password=get_password_hash("Demo1234!"),
    first_name="Demo",
    last_name="User",
    role=UserRole.OWNER,
    is_active=True,
    email_verified=True,
)
db.add(demo_user)
db.flush()

# ── Projects ──────────────────────────────────────────────────────────────────
def make_project(name, number, status, description, client, budget,
                 start, end, country="NZ", lat=None, lng=None):
    p = Project(
        id=uuid4(),
        organisation_id=org.id,
        created_by=demo_user.id,
        name=name,
        project_number=number,
        status=status,
        description=description,
        client_name=client,
        budget=Decimal(str(budget)),
        start_date=start,
        end_date=end,
        country_code=country,
        latitude=lat,
        longitude=lng,
        is_archived=False,
    )
    db.add(p)
    db.flush()
    db.add(ProjectVersion(
        project_id=p.id,
        version_number=1,
        name="Initial Version",
        description="Project created",
        snapshot={"name": p.name, "status": p.status, "budget": str(p.budget)},
        created_by=demo_user.id,
    ))
    for activity_type, content in [
        ("project_created", f"Project '{name}' was created"),
        ("status_updated", f"Status set to {status}"),
    ]:
        db.add(ProjectActivity(
            project_id=p.id,
            user_id=demo_user.id,
            activity_type=activity_type,
            content=content,
        ))
    return p

p1 = make_project(
    "Auckland Harbour Bridge Widening", "TPT-2024-001", "in_progress",
    "Structural widening of the Auckland Harbour Bridge to add two additional lanes "
    "and a dedicated active transport path.",
    "NZ Transport Agency", 48_500_000,
    date(2024, 3, 1), date(2026, 6, 30),
    lat=-36.8275, lng=174.7661,
)
p2 = make_project(
    "Wellington Wastewater Treatment Upgrade", "TPT-2024-002", "planning",
    "Full replacement of primary and secondary treatment infrastructure at the "
    "Moa Point Wastewater Treatment Plant.",
    "Wellington Water Ltd", 22_000_000,
    date(2024, 6, 1), date(2025, 12, 31),
    lat=-41.3443, lng=174.8218,
)
p3 = make_project(
    "Christchurch CBD Road Rehabilitation", "TPT-2025-001", "completed",
    "Full-depth reclamation and resurfacing of 14 km of central city roads "
    "damaged in the 2011 earthquake sequence.",
    "Christchurch City Council", 9_750_000,
    date(2025, 1, 15), date(2025, 8, 30),
    lat=-43.5320, lng=172.6362,
)
p4 = make_project(
    "Hamilton Ring Road — Stage 3", "TPT-2025-002", "draft",
    "Design and construction of 8.2 km of new arterial road connecting the "
    "Ruakura Inland Port to the Waikato Expressway.",
    "Waka Kotahi NZ Transport Agency", 31_200_000,
    date(2025, 9, 1), date(2027, 3, 31),
    lat=-37.7870, lng=175.2793,
)

projects = [p1, p2, p3, p4]

# ── Materials catalogue ───────────────────────────────────────────────────────
materials_data = [
    ("Structural Steel — Grade 300", "Steel", "tonne", 2850, "Pacific Steel", "Grade 300", 2.1),
    ("Reinforcing Bar 16mm (HD16)", "Steel", "tonne", 1650, "Pacific Steel", "Grade 500E", 1.8),
    ("Ready-Mix Concrete 30 MPa", "Concrete", "m³", 195, "Firth Industries", "30 MPa", 0.31),
    ("Ready-Mix Concrete 40 MPa", "Concrete", "m³", 215, "Firth Industries", "40 MPa", 0.33),
    ("Precast Concrete Panels", "Concrete", "m²", 420, "StressCrete", "40 MPa", 0.38),
    ("Asphalt AC14 (Wearing Course)", "Asphalt", "tonne", 135, "Fulton Hogan", "AC14", 0.09),
    ("Asphalt AC20 (Basecourse)", "Asphalt", "tonne", 125, "Downer NZ", "AC20", 0.08),
    ("Crushed Aggregate (GAP 40)", "Aggregate", "m³", 48, "Winstone Aggregates", "GAP 40", 0.02),
    ("Geotextile Fabric (non-woven)", "Geosynthetics", "m²", 3.20, "Tensar", "NW6", 0.005),
    ("HDPE Pipe DN300", "Pipe", "m", 88, "Iplex Pipelines", "PN12.5", 0.12),
    ("HDPE Pipe DN600", "Pipe", "m", 245, "Iplex Pipelines", "PN10", 0.25),
    ("Precast Box Culvert 900×600", "Drainage", "m", 380, "StressCrete", "AS/NZS 4058", 0.42),
    ("Barrier W-Beam Guardrail", "Safety", "m", 65, "Armco Superlite", "MASH TL3", 0.15),
    ("LED Road Light 150W", "Electrical", "unit", 1250, "Thorn Lighting", "IP66", 0.18),
    ("Traffic Signal Controller", "Electrical", "unit", 8400, "SWARCO", "Type T", 0.08),
    ("Epoxy Resin Anchor Grout", "Chemicals", "kg", 22, "Ramset", "HY-200", 0.04),
    ("Drainage Channel (ACO Drain)", "Drainage", "m", 95, "ACO NZ", "Multiline", 0.11),
    ("Expansion Joint (modular)", "Bridge", "m", 1850, "Mageba", "Type LR", 0.22),
    ("Bridge Bearing (elastomeric)", "Bridge", "unit", 3200, "Freyssinet NZ", "Type B", 0.28),
    ("Painted Road Markings (white)", "Road Marking", "m", 1.80, "Roadmarkers NZ", "ThermoPlastic", 0.003),
]

for name, cat, unit, cost, supplier, grade, carbon in materials_data:
    db.add(Material(
        id=uuid4(),
        organisation_id=org.id,
        name=name,
        category=cat,
        unit=unit,
        unit_cost=Decimal(str(cost)),
        supplier=supplier,
        grade=grade,
        carbon_footprint=Decimal(str(carbon)),
        availability="in_stock",
    ))

# ── Schedule tasks ────────────────────────────────────────────────────────────
def add_tasks(project, tasks):
    for name, start, end, progress, status, assignee, deps in tasks:
        db.add(ScheduleTask(
            id=uuid4(),
            project_id=project.id,
            organisation_id=org.id,
            name=name,
            start_date=start,
            end_date=end,
            duration=(end - start).days,
            progress=progress,
            status=status,
            dependencies=deps,
            assignee=assignee,
        ))

add_tasks(p1, [
    ("Geotechnical Investigation",  date(2024,3,1),  date(2024,4,15), 100, "completed",     "Geotech Team",        []),
    ("Preliminary Design",          date(2024,4,1),  date(2024,6,30), 100, "completed",     "Lead Engineer",       []),
    ("Resource Consent Application",date(2024,5,15), date(2024,9,30), 100, "completed",     "Environmental Lead",  []),
    ("Detailed Design",             date(2024,7,1),  date(2024,12,31),100, "completed",     "Design Team",         []),
    ("Pier Foundation Works",       date(2025,1,15), date(2025,6,30), 80,  "in_progress",   "Civil Contractor",    []),
    ("Steel Fabrication",           date(2025,3,1),  date(2025,9,30), 55,  "in_progress",   "Pacific Steel",       []),
    ("Deck Formwork & Concreting",  date(2025,7,1),  date(2026,1,31), 10,  "in_progress",   "Civil Contractor",    []),
    ("Active Transport Path",       date(2025,10,1), date(2026,4,30), 0,   "not_started",   "Civil Contractor",    []),
    ("Traffic Management & Commissioning", date(2026,5,1), date(2026,6,30), 0, "not_started","Traffic Mgmt Team",  []),
])

add_tasks(p2, [
    ("Site Investigation & Survey",  date(2024,6,1),  date(2024,7,15), 100, "completed",   "Survey Team",         []),
    ("Concept Design",               date(2024,7,1),  date(2024,9,30), 100, "completed",   "Process Engineer",    []),
    ("Resource Consent",             date(2024,9,1),  date(2025,2,28), 60,  "in_progress", "Environmental Lead",  []),
    ("Detailed Design",              date(2024,10,1), date(2025,4,30), 30,  "in_progress", "Design Team",         []),
    ("Procurement — Long Lead Items",date(2025,1,1),  date(2025,6,30), 0,   "not_started", "Procurement Manager", []),
    ("Civil Works",                  date(2025,6,1),  date(2025,10,31),0,   "not_started", "Civil Contractor",    []),
    ("Mechanical & Electrical Install",date(2025,9,1),date(2025,12,15),0,   "not_started", "M&E Contractor",      []),
    ("Commissioning & Handover",     date(2025,12,1), date(2025,12,31),0,   "not_started", "Project Manager",     []),
])

add_tasks(p3, [
    ("Pavement Condition Survey",   date(2025,1,15), date(2025,2,15), 100, "completed",   "Survey Team",         []),
    ("Design & Specification",      date(2025,2,1),  date(2025,3,31), 100, "completed",   "Pavement Engineer",   []),
    ("Contractor Procurement",      date(2025,3,15), date(2025,4,30), 100, "completed",   "Project Manager",     []),
    ("Zone 1 — FDR & Reseal",       date(2025,5,1),  date(2025,6,15), 100, "completed",   "Fulton Hogan",        []),
    ("Zone 2 — FDR & Reseal",       date(2025,6,1),  date(2025,7,15), 100, "completed",   "Fulton Hogan",        []),
    ("Zone 3 — FDR & Reseal",       date(2025,7,1),  date(2025,8,15), 100, "completed",   "Downer NZ",           []),
    ("Road Marking & Reinstatement",date(2025,8,1),  date(2025,8,30), 100, "completed",   "Roadmarkers NZ",      []),
])

add_tasks(p4, [
    ("Preliminary Route Investigation", date(2025,9,1),  date(2025,10,31), 0, "not_started", "Lead Engineer",    []),
    ("Stakeholder Consultation",        date(2025,10,1), date(2025,12,31), 0, "not_started", "Project Manager",  []),
    ("Environmental Impact Assessment", date(2025,11,1), date(2026,3,31),  0, "not_started", "Environmental Lead",[]),
    ("Preliminary Design",              date(2026,1,1),  date(2026,6,30),  0, "not_started", "Design Team",      []),
    ("Resource Consent",                date(2026,4,1),  date(2026,9,30),  0, "not_started", "Environmental Lead",[]),
])

# ── Estimate items ─────────────────────────────────────────────────────────────
def add_estimates(project, items):
    for desc, qty, unit, rate, cat in items:
        amount = Decimal(str(qty)) * Decimal(str(rate))
        db.add(EstimateItem(
            id=uuid4(),
            project_id=project.id,
            organisation_id=org.id,
            description=desc,
            quantity=Decimal(str(qty)),
            unit=unit,
            rate=Decimal(str(rate)),
            amount=amount,
            category=cat,
        ))

add_estimates(p1, [
    ("Structural Steel Supply & Fabrication", 850, "tonne",  2850,   "Materials"),
    ("Reinforcing Bar HD16",                  420, "tonne",  1650,   "Materials"),
    ("Pier Foundation Concrete 40 MPa",      1200, "m³",     215,    "Materials"),
    ("Deck Concrete 40 MPa",                 3500, "m³",     215,    "Materials"),
    ("Bridge Bearings (elastomeric)",          48, "unit",   3200,   "Equipment"),
    ("Expansion Joints (modular)",             80, "m",      1850,   "Equipment"),
    ("Guardrail W-Beam",                     1200, "m",       65,    "Materials"),
    ("LED Road Lighting",                      36, "unit",   1250,   "Electrical"),
    ("Traffic Signal Controllers",              4, "unit",   8400,   "Electrical"),
    ("Active Transport Path Surfacing",      4800, "m²",       55,   "Civil Works"),
    ("Traffic Management (months)",            28, "month", 45000,   "Preliminaries"),
    ("Project Management",                      1, "lump",2200000,   "Preliminaries"),
    ("Consenting & Investigation",              1, "lump",  480000,  "Professional Fees"),
    ("Detailed Design & Engineering",           1, "lump", 1850000,  "Professional Fees"),
    ("Contingency (10%)",                       1, "lump", 4750000,  "Contingency"),
])

add_estimates(p2, [
    ("Primary Treatment — Screens & Grit",   1, "lump",  1_800_000, "Civil Works"),
    ("Secondary Treatment — Bioreactors",    1, "lump",  6_200_000, "Civil Works"),
    ("HDPE Pipe DN600 (outfall upgrade)",  420, "m",         245,   "Materials"),
    ("Mechanical & Electrical Package",      1, "lump",  4_500_000, "Mechanical"),
    ("SCADA & Instrumentation",              1, "lump",    950_000, "Electrical"),
    ("Site Civil Works",                     1, "lump",  2_100_000, "Civil Works"),
    ("Environmental Consenting",             1, "lump",    320_000, "Professional Fees"),
    ("Detailed Design",                      1, "lump",  1_100_000, "Professional Fees"),
    ("Commissioning & Testing",              1, "lump",    450_000, "Preliminaries"),
    ("Contingency (15%)",                    1, "lump",  2_250_000, "Contingency"),
])

add_estimates(p3, [
    ("Full-Depth Reclamation Works",       14_000, "m²",   185,  "Civil Works"),
    ("Asphalt AC20 Basecourse",              3_200, "tonne", 125, "Materials"),
    ("Asphalt AC14 Wearing Course",          2_800, "tonne", 135, "Materials"),
    ("Crushed Aggregate (GAP40)",            4_500, "m³",    48,  "Materials"),
    ("Drainage Reinstatement",                 850, "m",     95,  "Civil Works"),
    ("Road Marking — Thermoplastic",         8_500, "m",    1.80, "Road Marking"),
    ("Traffic Management",                       1, "lump", 320_000, "Preliminaries"),
    ("Project Management",                       1, "lump", 195_000, "Preliminaries"),
])

add_estimates(p4, [
    ("Route Investigation & Survey",    1, "lump",   380_000, "Professional Fees"),
    ("Environmental Impact Assessment", 1, "lump",   520_000, "Professional Fees"),
    ("Preliminary Design",              1, "lump",   750_000, "Professional Fees"),
    ("Stakeholder & Community Engagement",1,"lump",  210_000, "Preliminaries"),
    ("Contingency (20% — early stage)", 1, "lump", 3_700_000, "Contingency"),
])

# ── Purchase orders ───────────────────────────────────────────────────────────
def add_po(project, po_number, supplier, status, items):
    total = sum(Decimal(str(i["qty"])) * Decimal(str(i["rate"])) for i in items)
    line_items = [
        {"description": i["desc"], "quantity": i["qty"],
         "unit": i["unit"], "rate": i["rate"],
         "amount": float(Decimal(str(i["qty"])) * Decimal(str(i["rate"])))}
        for i in items
    ]
    db.add(PurchaseOrder(
        id=uuid4(),
        project_id=project.id,
        organisation_id=org.id,
        po_number=po_number,
        supplier_name=supplier,
        status=status,
        total_value=total,
        line_items=line_items,
        created_by=demo_user.id,
    ))

add_po(p1, "PO-2024-0011", "Pacific Steel NZ Ltd", "approved", [
    {"desc": "Structural Steel Grade 300", "qty": 850, "unit": "tonne", "rate": 2850},
    {"desc": "Reinforcing Bar HD16",       "qty": 420, "unit": "tonne", "rate": 1650},
])
add_po(p1, "PO-2024-0022", "Freyssinet NZ", "approved", [
    {"desc": "Elastomeric Bridge Bearings", "qty": 48,  "unit": "unit", "rate": 3200},
    {"desc": "Modular Expansion Joints",    "qty": 80,  "unit": "m",    "rate": 1850},
])
add_po(p1, "PO-2024-0033", "Thorn Lighting NZ", "pending", [
    {"desc": "LED Road Light 150W (IP66)",  "qty": 36,  "unit": "unit", "rate": 1250},
    {"desc": "Traffic Signal Controller",   "qty": 4,   "unit": "unit", "rate": 8400},
])
add_po(p2, "PO-2024-0041", "Iplex Pipelines", "approved", [
    {"desc": "HDPE Pipe DN600 PN10", "qty": 420, "unit": "m", "rate": 245},
    {"desc": "HDPE Pipe DN300 PN12.5","qty": 180, "unit": "m", "rate": 88},
])
add_po(p2, "PO-2024-0052", "SWARCO Australia", "draft", [
    {"desc": "SCADA RTU Controllers", "qty": 3, "unit": "unit", "rate": 28000},
])
add_po(p3, "PO-2025-0061", "Fulton Hogan Ltd", "invoiced", [
    {"desc": "Asphalt AC14 Wearing Course", "qty": 1600, "unit": "tonne", "rate": 135},
    {"desc": "Asphalt AC20 Basecourse",     "qty": 1900, "unit": "tonne", "rate": 125},
])
add_po(p3, "PO-2025-0072", "Roadmarkers NZ", "paid", [
    {"desc": "Thermoplastic Road Marking", "qty": 8500, "unit": "m", "rate": 1.80},
])

# ── Bills of materials ────────────────────────────────────────────────────────
def add_bom(project, title, items):
    total = sum(Decimal(str(i["qty"])) * Decimal(str(i["rate"])) for i in items)
    line_items = [
        {"material": i["mat"], "description": i["desc"],
         "quantity": i["qty"], "unit": i["unit"],
         "rate": i["rate"],
         "total": float(Decimal(str(i["qty"])) * Decimal(str(i["rate"])))}
        for i in items
    ]
    db.add(BillOfMaterials(
        id=uuid4(),
        project_id=project.id,
        organisation_id=org.id,
        title=title,
        line_items=line_items,
        total_value=total,
    ))

add_bom(p1, "Bridge Superstructure BOM", [
    {"mat": "Structural Steel Grade 300", "desc": "Main girders & cross-beams",   "qty": 850,  "unit": "tonne", "rate": 2850},
    {"mat": "Reinforcing Bar HD16",       "desc": "Deck slab reinforcement",      "qty": 420,  "unit": "tonne", "rate": 1650},
    {"mat": "Ready-Mix Concrete 40 MPa",  "desc": "Bridge deck concrete",         "qty": 3500, "unit": "m³",    "rate": 215},
    {"mat": "Expansion Joint (modular)",  "desc": "End & intermediate joints",    "qty": 80,   "unit": "m",     "rate": 1850},
    {"mat": "Bridge Bearing (elastomeric)","desc":"Main pier bearings",           "qty": 48,   "unit": "unit",  "rate": 3200},
    {"mat": "Epoxy Resin Anchor Grout",   "desc": "Anchor bolt installation",     "qty": 2400, "unit": "kg",    "rate": 22},
])
add_bom(p2, "Treatment Plant Equipment BOM", [
    {"mat": "HDPE Pipe DN600",          "desc": "Outfall rising main",              "qty": 420,  "unit": "m",    "rate": 245},
    {"mat": "HDPE Pipe DN300",          "desc": "Internal process pipework",        "qty": 850,  "unit": "m",    "rate": 88},
    {"mat": "Precast Concrete Panels",  "desc": "Tank wall cladding",               "qty": 1200, "unit": "m²",   "rate": 420},
    {"mat": "Ready-Mix Concrete 30 MPa","desc": "Foundations & slabs",              "qty": 600,  "unit": "m³",   "rate": 195},
    {"mat": "Geotextile Fabric",        "desc": "Sub-base separation layer",        "qty": 2500, "unit": "m²",   "rate": 3.20},
])
add_bom(p3, "Road Rehabilitation Materials BOM", [
    {"mat": "Asphalt AC20 (Basecourse)",     "desc": "New basecourse layer",     "qty": 3200, "unit": "tonne", "rate": 125},
    {"mat": "Asphalt AC14 (Wearing Course)", "desc": "Wearing course",           "qty": 2800, "unit": "tonne", "rate": 135},
    {"mat": "Crushed Aggregate (GAP 40)",    "desc": "FDR stabilisation",        "qty": 4500, "unit": "m³",    "rate": 48},
    {"mat": "Drainage Channel (ACO Drain)",  "desc": "Kerb & channel drainage",  "qty": 850,  "unit": "m",     "rate": 95},
    {"mat": "Painted Road Markings (white)", "desc": "Lane & edge markings",     "qty": 8500, "unit": "m",     "rate": 1.80},
])

# ── Reports ───────────────────────────────────────────────────────────────────
report_defs = [
    (p1, "Auckland Harbour Bridge — Monthly Progress Report", "progress",   "published"),
    (p1, "Auckland Harbour Bridge — Cost Report #4",          "cost",       "published"),
    (p2, "Moa Point WWTP — Feasibility Assessment",           "feasibility","published"),
    (p2, "Moa Point WWTP — Design Review Report",             "design",     "draft"),
    (p3, "CBD Road Rehab — Completion Report",                "completion", "published"),
    (p3, "CBD Road Rehab — As-Built Survey",                  "as_built",   "published"),
    (p4, "Hamilton Ring Road Stg3 — Options Analysis",        "feasibility","draft"),
    (None,"Quarterly Portfolio Performance Report Q2 2025",   "portfolio",  "published"),
]

for proj, title, rtype, rstatus in report_defs:
    db.add(GeneratedReport(
        id=uuid4(),
        project_id=proj.id if proj else None,
        organisation_id=org.id,
        title=title,
        report_type=rtype,
        status=rstatus,
        format="json",
        content={"summary": f"Auto-generated {rtype} report for demo purposes."},
        created_by=demo_user.id,
    ))

# ── Notifications ─────────────────────────────────────────────────────────────
notif_defs = [
    ("project_update",  p1.id, "Harbour Bridge — pier works on track",
     "Pier foundation works are 80% complete and on schedule.", False),
    ("budget_alert",    p1.id, "Budget threshold reached — Bridge project",
     "The Auckland Harbour Bridge project has consumed 72% of its approved budget.", False),
    ("task_due",        p2.id, "Resource Consent deadline in 14 days",
     "The resource consent for Moa Point WWTP is due by end of month.", True),
    ("project_update",  p3.id, "CBD Road Rehab — project completed",
     "All works on the Christchurch CBD Road Rehabilitation are complete.", True),
    ("mention",         p4.id, "You were mentioned in Hamilton Ring Road",
     "@Demo User please review the updated options analysis document.", False),
    ("report_ready",    None,  "Q2 Portfolio Report is ready",
     "Your quarterly portfolio performance report has been generated and is ready to view.", True),
]

for ntype, proj_id, title, content, is_read in notif_defs:
    db.add(Notification(
        id=uuid4(),
        user_id=demo_user.id,
        project_id=proj_id,
        notification_type=ntype,
        title=title,
        content=content,
        is_read=is_read,
        sent_email=False,
        sent_push=False,
    ))

# ── Commit ────────────────────────────────────────────────────────────────────
db.commit()
org_name = org.name
db.close()

print("✓ Demo seed complete.")
print("  Login: demo@tpt.local / Demo1234!")
print(f"  Organisation: {org_name}")
print(f"  Projects: {len(projects)}")
print(f"  Materials: {len(materials_data)}")

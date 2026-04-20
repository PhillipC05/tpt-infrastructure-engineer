"""
Phase 8: PROCUREMENT Module
Purchase Order System for TPT Infrastructure Engineer Platform
Handles Bill of Materials, Tenders, Quotations, Purchase Orders, and Procurement Tracking
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
import uuid
from decimal import Decimal


class POStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT = "sent"
    ACKNOWLEDGED = "acknowledged"
    PARTIAL_DELIVERY = "partial_delivery"
    FULLY_DELIVERED = "fully_delivered"
    INVOICED = "invoiced"
    PAID = "paid"
    CANCELLED = "cancelled"


class QuoteStatus(str, Enum):
    REQUESTED = "requested"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class TenderStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    EVALUATING = "evaluating"
    AWARDED = "awarded"
    CANCELLED = "cancelled"


class LineItem(BaseModel):
    item_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    material_code: Optional[str] = None
    trade_code: Optional[str] = None
    tax_rate: Decimal = Decimal('0.15')
    total: Decimal = Decimal('0')
    
    def calculate_total(self) -> Decimal:
        subtotal = self.quantity * self.unit_price
        tax = subtotal * self.tax_rate
        self.total = subtotal + tax
        return self.total


class BillOfMaterials(BaseModel):
    bom_id: str = Field(default_factory=lambda: f"BOM-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}")
    project_id: str
    title: str
    description: Optional[str] = None
    line_items: List[LineItem] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    revision: int = 1
    total_value: Decimal = Decimal('0')
    
    def calculate_total(self) -> Decimal:
        self.total_value = sum(item.calculate_total() for item in self.line_items)
        return self.total_value


class Supplier(BaseModel):
    supplier_id: str
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    currency: str = "NZD"
    payment_terms: int = 30
    rating: Optional[float] = None


class SupplierQuote(BaseModel):
    quote_id: str = Field(default_factory=lambda: f"QUO-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}")
    project_id: str
    supplier_id: str
    reference: Optional[str] = None
    line_items: List[LineItem] = []
    status: QuoteStatus = QuoteStatus.REQUESTED
    valid_until: Optional[datetime] = None
    delivery_estimate: Optional[int] = None
    notes: Optional[str] = None
    total_value: Decimal = Decimal('0')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None


class TenderPackage(BaseModel):
    tender_id: str = Field(default_factory=lambda: f"TEN-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}")
    project_id: str
    title: str
    description: str
    scope_of_works: str
    closing_date: datetime
    status: TenderStatus = TenderStatus.DRAFT
    invited_suppliers: List[str] = []
    received_quotes: List[str] = []
    awarded_supplier: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PurchaseOrder(BaseModel):
    po_id: str = Field(default_factory=lambda: f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}")
    project_id: str
    supplier_id: str
    reference: Optional[str] = None
    line_items: List[LineItem] = []
    status: POStatus = POStatus.DRAFT
    delivery_address: Optional[str] = None
    delivery_date: Optional[datetime] = None
    payment_terms: int = 30
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    total_value: Decimal = Decimal('0')
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DeliveryItem(BaseModel):
    delivery_id: str
    po_id: str
    line_item_id: str
    quantity_delivered: Decimal
    delivery_date: datetime
    received_by: str
    notes: Optional[str] = None


class VariationOrder(BaseModel):
    vo_id: str = Field(default_factory=lambda: f"VO-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}")
    po_id: str
    project_id: str
    description: str
    reason: str
    value_change: Decimal
    status: str = "pending"
    approved_by: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProcurementSystem:
    """
    Main Procurement System engine
    """
    
    def __init__(self):
        self.boms: Dict[str, BillOfMaterials] = {}
        self.purchase_orders: Dict[str, PurchaseOrder] = {}
        self.tenders: Dict[str, TenderPackage] = {}
        self.quotes: Dict[str, SupplierQuote] = {}
        self.variations: Dict[str, VariationOrder] = {}
        self.suppliers: Dict[str, Supplier] = {}
    
    def generate_bom_from_estimate(self, project_id: str, estimate_data: Dict[str, Any], 
                                  created_by: str, title: Optional[str] = None) -> BillOfMaterials:
        """Generate Bill of Materials automatically from cost estimate"""
        
        bom = BillOfMaterials(
            project_id=project_id,
            title=title or f"Bill of Materials for Project {project_id}",
            created_by=created_by
        )
        
        # Extract materials from estimate
        if 'materials' in estimate_data:
            for material in estimate_data['materials']:
                item = LineItem(
                    description=material.get('description', ''),
                    quantity=Decimal(str(material.get('quantity', 0))),
                    unit=material.get('unit', 'each'),
                    unit_price=Decimal(str(material.get('unit_cost', 0))),
                    material_code=material.get('code')
                )
                bom.line_items.append(item)
        
        bom.calculate_total()
        self.boms[bom.bom_id] = bom
        return bom
    
    def create_tender_package(self, project_id: str, title: str, description: str,
                             scope_of_works: str, closing_date: datetime, 
                             created_by: str) -> TenderPackage:
        """Create new tender package"""
        
        tender = TenderPackage(
            project_id=project_id,
            title=title,
            description=description,
            scope_of_works=scope_of_works,
            closing_date=closing_date,
            created_by=created_by
        )
        
        self.tenders[tender.tender_id] = tender
        return tender
    
    def request_quotation(self, project_id: str, supplier_id: str, items: List[LineItem]) -> SupplierQuote:
        """Request quotation from supplier"""
        
        quote = SupplierQuote(
            project_id=project_id,
            supplier_id=supplier_id,
            line_items=items,
            status=QuoteStatus.REQUESTED
        )
        
        self.quotes[quote.quote_id] = quote
        return quote
    
    def compare_quotes(self, quote_ids: List[str]) -> Dict[str, Any]:
        """Compare multiple supplier quotations side by side"""
        
        quotes = [self.quotes[qid] for qid in quote_ids if qid in self.quotes]
        
        comparison = {
            'quote_ids': quote_ids,
            'total_values': {q.quote_id: float(q.total_value) for q in quotes},
            'item_comparison': [],
            'recommendation': None
        }
        
        # Find lowest total
        lowest_quote = min(quotes, key=lambda q: q.total_value) if quotes else None
        if lowest_quote:
            comparison['recommendation'] = lowest_quote.quote_id
        
        return comparison
    
    def create_purchase_order(self, project_id: str, supplier_id: str, 
                             line_items: List[LineItem], created_by: str) -> PurchaseOrder:
        """Create new purchase order"""
        
        po = PurchaseOrder(
            project_id=project_id,
            supplier_id=supplier_id,
            line_items=line_items,
            created_by=created_by
        )
        
        po.total_value = sum(item.calculate_total() for item in line_items)
        self.purchase_orders[po.po_id] = po
        return po
    
    def create_po_from_quote(self, quote_id: str, created_by: str) -> PurchaseOrder:
        """Create purchase order directly from accepted quote"""
        
        if quote_id not in self.quotes:
            raise ValueError(f"Quote {quote_id} not found")
        
        quote = self.quotes[quote_id]
        
        po = self.create_purchase_order(
            project_id=quote.project_id,
            supplier_id=quote.supplier_id,
            line_items=quote.line_items.copy(),
            created_by=created_by
        )
        
        return po
    
    def approve_purchase_order(self, po_id: str, approver_id: str) -> PurchaseOrder:
        """Approve purchase order for sending"""
        
        if po_id not in self.purchase_orders:
            raise ValueError(f"Purchase Order {po_id} not found")
        
        po = self.purchase_orders[po_id]
        po.status = POStatus.APPROVED
        po.approved_by = approver_id
        po.approved_at = datetime.utcnow()
        
        return po
    
    def record_delivery(self, po_id: str, line_item_id: str, quantity: Decimal,
                       received_by: str, notes: Optional[str] = None) -> DeliveryItem:
        """Record delivery against purchase order line item"""
        
        delivery = DeliveryItem(
            delivery_id=f"DEL-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}",
            po_id=po_id,
            line_item_id=line_item_id,
            quantity_delivered=quantity,
            delivery_date=datetime.utcnow(),
            received_by=received_by,
            notes=notes
        )
        
        # Update PO status
        if po_id in self.purchase_orders:
            po = self.purchase_orders[po_id]
            po.status = POStatus.PARTIAL_DELIVERY
            # Check if all items delivered
            # (Full delivery check logic would go here)
        
        return delivery
    
    def create_variation_order(self, po_id: str, project_id: str, description: str,
                              reason: str, value_change: Decimal, created_by: str) -> VariationOrder:
        """Create variation order for an existing purchase order"""
        
        vo = VariationOrder(
            po_id=po_id,
            project_id=project_id,
            description=description,
            reason=reason,
            value_change=value_change,
            created_by=created_by
        )
        
        self.variations[vo.vo_id] = vo
        
        # Update PO total
        if po_id in self.purchase_orders:
            self.purchase_orders[po_id].total_value += value_change
        
        return vo
    
    def get_project_budget_status(self, project_id: str) -> Dict[str, Any]:
        """Get budget tracking status for project"""
        
        project_pos = [po for po in self.purchase_orders.values() if po.project_id == project_id]
        
        total_committed = sum(po.total_value for po in project_pos if po.status >= POStatus.APPROVED)
        total_spent = sum(po.total_value for po in project_pos if po.status in [POStatus.INVOICED, POStatus.PAID])
        
        return {
            'project_id': project_id,
            'total_purchase_orders': len(project_pos),
            'total_committed': float(total_committed),
            'total_spent': float(total_spent),
            'status': 'on_track'
        }


# Initialize procurement system instance
procurement_system = ProcurementSystem()
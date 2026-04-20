"""
Unit Tests for Phase 8 Procurement Module
"""

import pytest
from decimal import Decimal
from datetime import datetime
from backend.procurement import ProcurementSystem, POStatus, QuoteStatus, TenderStatus, LineItem


@pytest.fixture
def procurement_system():
    return ProcurementSystem()


class TestProcurementSystem:
    
    def test_bom_generation(self, procurement_system):
        """Test Bill of Materials generation"""
        estimate_data = {
            "materials": [
                {
                    "description": "Concrete 25MPa",
                    "quantity": 120,
                    "unit": "m³",
                    "unit_cost": 245.50,
                    "code": "MAT-001"
                },
                {
                    "description": "Steel Reinforcement 12mm",
                    "quantity": 4500,
                    "unit": "kg",
                    "unit_cost": 3.15,
                    "code": "MAT-023"
                }
            ]
        }
        
        bom = procurement_system.generate_bom_from_estimate(
            project_id="test-proj-001",
            estimate_data=estimate_data,
            created_by="test-user"
        )
        
        assert bom is not None
        assert bom.bom_id.startswith("BOM-")
        assert len(bom.line_items) == 2
        assert bom.total_value > 0
    
    def test_purchase_order_creation(self, procurement_system):
        """Test Purchase Order creation and approval"""
        items = [
            LineItem(
                description="Test Item",
                quantity=Decimal('10'),
                unit="each",
                unit_price=Decimal('99.95')
            )
        ]
        
        po = procurement_system.create_purchase_order(
            project_id="test-proj-001",
            supplier_id="supplier-001",
            line_items=items,
            created_by="test-user"
        )
        
        assert po is not None
        assert po.po_id.startswith("PO-")
        assert po.status == POStatus.DRAFT
        assert po.total_value == Decimal('1149.425')  # 10 * 99.95 * 1.15 tax
        
        # Approve PO
        po = procurement_system.approve_purchase_order(po.po_id, "approver-1")
        assert po.status == POStatus.APPROVED
        assert po.approved_by == "approver-1"
    
    def test_quote_comparison(self, procurement_system):
        """Test supplier quotation comparison"""
        items = [LineItem(description="Test Item", quantity=Decimal('100'), unit="each", unit_price=Decimal('10.00'))]
        
        quote1 = procurement_system.request_quotation("test-proj-001", "supplier-001", items)
        quote1.total_value = Decimal('1150.00')
        quote1.status = QuoteStatus.SUBMITTED
        procurement_system.quotes[quote1.quote_id] = quote1
        
        quote2 = procurement_system.request_quotation("test-proj-001", "supplier-002", items)
        quote2.total_value = Decimal('1092.50')
        quote2.status = QuoteStatus.SUBMITTED
        procurement_system.quotes[quote2.quote_id] = quote2
        
        comparison = procurement_system.compare_quotes([quote1.quote_id, quote2.quote_id])
        
        assert comparison is not None
        assert 'recommendation' in comparison
        assert comparison['recommendation'] == quote2.quote_id  # Lower quote should be recommended
    
    def test_variation_order(self, procurement_system):
        """Test Variation Order creation"""
        items = [LineItem(description="Test Item", quantity=Decimal('10'), unit="each", unit_price=Decimal('100.00'))]
        po = procurement_system.create_purchase_order("test-proj-001", "supplier-001", items, "test-user")
        
        original_total = po.total_value
        
        vo = procurement_system.create_variation_order(
            po_id=po.po_id,
            project_id="test-proj-001",
            description="Additional items required",
            reason="Site variation",
            value_change=Decimal('1500.00'),
            created_by="test-user"
        )
        
        assert vo is not None
        assert vo.vo_id.startswith("VO-")
        assert procurement_system.purchase_orders[po.po_id].total_value == original_total + Decimal('1500.00')
    
    def test_budget_tracking(self, procurement_system):
        """Test project budget tracking"""
        for i in range(3):
            po = procurement_system.create_purchase_order(
                project_id="test-proj-001",
                supplier_id=f"supplier-{i}",
                line_items=[LineItem(description=f"Item {i}", quantity=Decimal('1'), unit="each", unit_price=Decimal('1000.00'))],
                created_by="test-user"
            )
            procurement_system.approve_purchase_order(po.po_id, "approver")
        
        budget = procurement_system.get_project_budget_status("test-proj-001")
        
        assert budget['total_purchase_orders'] == 3
        assert budget['total_committed'] == pytest.approx(3450.0)  # 3 * 1000 * 1.15


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
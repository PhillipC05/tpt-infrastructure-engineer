"""
Unit Tests for Phase 7 Reporting Module
"""

import pytest
from datetime import datetime, timedelta
from backend.reporting import ReportGenerator, ReportType, ReportFormat, ReportStatus


@pytest.fixture
def report_generator():
    return ReportGenerator()


class TestReportGenerator:
    
    def test_template_loading(self, report_generator):
        """Test that all default templates load correctly"""
        templates = report_generator.get_available_templates()
        assert len(templates) == 5
        
        feasibility_templates = report_generator.get_available_templates(ReportType.FEASIBILITY)
        assert len(feasibility_templates) == 1
        assert feasibility_templates[0].template_id == "feasibility_standard"
    
    def test_report_generation(self, report_generator):
        """Test report generation from template"""
        test_data = {
            "executive_summary": "Test project is viable.",
            "project_overview": "Test infrastructure project.",
            "recommendations": "Proceed with construction.",
            "conclusion": "Project approved."
        }
        
        report = report_generator.generate_report(
            project_id="test-proj-001",
            template_id="feasibility_standard",
            user_id="test-user",
            report_data=test_data,
            title="Test Feasibility Report"
        )
        
        assert report is not None
        assert report.report_id.startswith("report_")
        assert report.project_id == "test-proj-001"
        assert report.title == "Test Feasibility Report"
        assert report.status == ReportStatus.DRAFT
        assert len(report.sections) == 10
    
    def test_report_approval_workflow(self, report_generator):
        """Test full approval workflow"""
        report = report_generator.generate_report(
            project_id="test-proj-001",
            template_id="cost_estimate_standard",
            user_id="creator-user",
            report_data={}
        )
        
        assert report.status == ReportStatus.DRAFT
        
        # Submit for approval
        report = report_generator.submit_for_approval(report, ["approver-1", "approver-2"])
        assert report.status == ReportStatus.SUBMITTED
        assert len(report.approvers) == 2
        
        # Approve
        report = report_generator.approve_report(report, "approver-1")
        assert report.status == ReportStatus.APPROVED
        assert report.approved_by == "approver-1"
        assert report.approved_at is not None
    
    def test_export_formats(self, report_generator):
        """Test all export formats"""
        report = report_generator.generate_report(
            project_id="test-proj-001",
            template_id="feasibility_standard",
            user_id="test-user",
            report_data={"test": "data"}
        )
        
        for format in ReportFormat:
            buffer = report_generator.export_report(report, format)
            assert buffer is not None
            assert buffer.getbuffer().nbytes > 0
    
    def test_invalid_template(self, report_generator):
        """Test error handling for invalid template"""
        with pytest.raises(ValueError):
            report_generator.generate_report(
                project_id="test-proj-001",
                template_id="invalid-template",
                user_id="test-user",
                report_data={}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
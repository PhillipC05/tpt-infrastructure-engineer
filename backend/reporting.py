"""
Phase 7: Reporting & Documentation Module
Report Generator for TPT Infrastructure Engineer Platform
Handles report templates, generation, export formats, and approval workflows
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
import json
import csv
from io import BytesIO, StringIO


class ReportType(str, Enum):
    FEASIBILITY = "feasibility"
    COST_ESTIMATE = "cost_estimate"
    TENDER_DOCUMENTATION = "tender_documentation"
    CONSTRUCTION_METHODOLOGY = "construction_methodology"
    COMPLIANCE = "compliance"
    SCHEDULE = "schedule"
    RISK_ASSESSMENT = "risk_assessment"
    TRADE_BREAKDOWN = "trade_breakdown"


class ReportFormat(str, Enum):
    PDF = "pdf"
    WORD = "docx"
    EXCEL = "xlsx"
    CSV = "csv"
    JSON = "json"
    HTML = "html"


class ReportStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReportSection(BaseModel):
    section_id: str
    title: str
    content: Any = None
    order: int
    visible: bool = True
    required: bool = False


class ReportTemplate(BaseModel):
    template_id: str
    name: str
    report_type: ReportType
    country_code: Optional[str] = None
    version: str = "1.0.0"
    sections: List[ReportSection] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GeneratedReport(BaseModel):
    report_id: str
    project_id: str
    template_id: str
    title: str
    report_type: ReportType
    status: ReportStatus = ReportStatus.DRAFT
    format: ReportFormat = ReportFormat.PDF
    generated_by: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = {}
    sections: List[ReportSection] = []
    approvers: List[str] = []
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    revision: int = 1


class ReportGenerator:
    """
    Main Report Generator engine
    """
    
    def __init__(self):
        self.templates = self._load_default_templates()
    
    def _load_default_templates(self) -> Dict[str, ReportTemplate]:
        """Load default report templates"""
        return {
            "feasibility_standard": ReportTemplate(
                template_id="feasibility_standard",
                name="Standard Feasibility Report",
                report_type=ReportType.FEASIBILITY,
                sections=[
                    ReportSection(section_id="executive_summary", title="Executive Summary", order=1, required=True),
                    ReportSection(section_id="project_overview", title="Project Overview", order=2, required=True),
                    ReportSection(section_id="site_assessment", title="Site Assessment", order=3),
                    ReportSection(section_id="geotechnical_analysis", title="Geotechnical Analysis", order=4),
                    ReportSection(section_id="environmental_impact", title="Environmental Impact Assessment", order=5),
                    ReportSection(section_id="cost_analysis", title="Cost Analysis", order=6),
                    ReportSection(section_id="schedule_analysis", title="Schedule Analysis", order=7),
                    ReportSection(section_id="risk_assessment", title="Risk Assessment", order=8),
                    ReportSection(section_id="recommendations", title="Recommendations", order=9, required=True),
                    ReportSection(section_id="conclusion", title="Conclusion", order=10, required=True),
                ]
            ),
            "cost_estimate_standard": ReportTemplate(
                template_id="cost_estimate_standard",
                name="Standard Cost Estimate Report",
                report_type=ReportType.COST_ESTIMATE,
                sections=[
                    ReportSection(section_id="summary", title="Cost Summary", order=1, required=True),
                    ReportSection(section_id="assumptions", title="Estimation Assumptions", order=2, required=True),
                    ReportSection(section_id="materials_breakdown", title="Materials Breakdown", order=3),
                    ReportSection(section_id="labour_breakdown", title="Labour Breakdown", order=4),
                    ReportSection(section_id="plant_equipment", title="Plant & Equipment", order=5),
                    ReportSection(section_id="overheads", title="Overheads & Margin", order=6),
                    ReportSection(section_id="contingency", title="Contingency Allowance", order=7),
                    ReportSection(section_id="total_cost", title="Total Project Cost", order=8, required=True),
                ]
            ),
            "tender_standard": ReportTemplate(
                template_id="tender_standard",
                name="Standard Tender Documentation",
                report_type=ReportType.TENDER_DOCUMENTATION,
                sections=[
                    ReportSection(section_id="invitation", title="Invitation to Tender", order=1, required=True),
                    ReportSection(section_id="scope", title="Scope of Works", order=2, required=True),
                    ReportSection(section_id="specifications", title="Technical Specifications", order=3),
                    ReportSection(section_id="pricing_schedule", title="Pricing Schedule", order=4),
                    ReportSection(section_id="conditions", title="Contract Conditions", order=5),
                    ReportSection(section_id="submission_requirements", title="Submission Requirements", order=6, required=True),
                ]
            ),
            "compliance_standard": ReportTemplate(
                template_id="compliance_standard",
                name="Regulatory Compliance Report",
                report_type=ReportType.COMPLIANCE,
                sections=[
                    ReportSection(section_id="regulatory_overview", title="Regulatory Framework Overview", order=1),
                    ReportSection(section_id="compliance_checklist", title="Compliance Checklist", order=2, required=True),
                    ReportSection(section_id="code_adherence", title="Building Code Adherence", order=3),
                    ReportSection(section_id="certifications", title="Required Certifications", order=4),
                    ReportSection(section_id="approval_pathway", title="Approval Pathway", order=5),
                ]
            ),
            "construction_methodology_standard": ReportTemplate(
                template_id="construction_methodology_standard",
                name="Construction Methodology Report",
                report_type=ReportType.CONSTRUCTION_METHODOLOGY,
                sections=[
                    ReportSection(section_id="method_statement", title="Method Statement", order=1, required=True),
                    ReportSection(section_id="work_sequence", title="Construction Work Sequence", order=2),
                    ReportSection(section_id="safety_plan", title="Health & Safety Plan", order=3, required=True),
                    ReportSection(section_id="quality_control", title="Quality Control Measures", order=4),
                    ReportSection(section_id="site_layout", title="Site Layout Plan", order=5),
                ]
            ),
            "trade_breakdown_standard": ReportTemplate(
                template_id="trade_breakdown_standard",
                name="Trade Breakdown Report",
                report_type=ReportType.TRADE_BREAKDOWN,
                sections=[
                    ReportSection(section_id="summary", title="Trade Summary", order=1, required=True),
                    ReportSection(section_id="civil", title="Civil Works", order=2),
                    ReportSection(section_id="structural", title="Structural Works", order=3),
                    ReportSection(section_id="architectural", title="Architectural Works", order=4),
                    ReportSection(section_id="mechanical", title="Mechanical Works", order=5),
                    ReportSection(section_id="electrical", title="Electrical Works", order=6),
                    ReportSection(section_id="plumbing", title="Plumbing & Drainage", order=7),
                    ReportSection(section_id="external", title="External Works", order=8),
                    ReportSection(section_id="labour_summary", title="Labour Summary", order=9),
                    ReportSection(section_id="programme", title="Trade Programme", order=10, required=True),
                ]
            )
        }
    
    def get_available_templates(self, report_type: Optional[ReportType] = None) -> List[ReportTemplate]:
        """Get all available report templates, optionally filtered by type"""
        templates = list(self.templates.values())
        if report_type:
            return [t for t in templates if t.report_type == report_type]
        return templates
    
    def generate_report(self, project_id: str, template_id: str, user_id: str, 
                       report_data: Dict[str, Any], title: Optional[str] = None) -> GeneratedReport:
        """Generate a new report from a template with project data"""
        
        if template_id not in self.templates:
            raise ValueError(f"Template {template_id} not found")
        
        template = self.templates[template_id]
        
        report = GeneratedReport(
            report_id=f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            project_id=project_id,
            template_id=template_id,
            title=title or template.name,
            report_type=template.report_type,
            generated_by=user_id,
            data=report_data
        )
        
        # Populate sections with data
        report.sections = []
        for section in template.sections:
            section_data = report_data.get(section.section_id, {})
            report.sections.append(
                ReportSection(
                    section_id=section.section_id,
                    title=section.title,
                    content=section_data,
                    order=section.order,
                    visible=section.visible,
                    required=section.required
                )
            )
        
        return report
    
    def export_report(self, report: GeneratedReport, export_format: ReportFormat) -> BytesIO:
        """Export report to specified format"""
        
        if export_format == ReportFormat.JSON:
            return self._export_json(report)
        elif export_format == ReportFormat.CSV:
            return self._export_csv(report)
        elif export_format == ReportFormat.HTML:
            return self._export_html(report)
        else:
            # For PDF/Word/Excel we would use appropriate libraries
            # Placeholder implementation
            buffer = BytesIO()
            buffer.write(f"Report exported as {export_format}".encode())
            buffer.seek(0)
            return buffer
    
    def _export_json(self, report: GeneratedReport) -> BytesIO:
        buffer = BytesIO()
        json_data = json.dumps(report.dict(), default=str, indent=2)
        buffer.write(json_data.encode())
        buffer.seek(0)
        return buffer
    
    def _export_csv(self, report: GeneratedReport) -> BytesIO:
        buffer = BytesIO()
        text_buffer = StringIO()
        
        writer = csv.writer(text_buffer)
        writer.writerow(["Section", "Content"])
        
        for section in sorted(report.sections, key=lambda s: s.order):
            writer.writerow([section.title, str(section.content)])
        
        text_buffer.seek(0)
        buffer.write(text_buffer.read().encode())
        buffer.seek(0)
        return buffer
    
    def _export_html(self, report: GeneratedReport) -> BytesIO:
        buffer = BytesIO()
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{report.title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }}
                h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 1rem; }}
                .section {{ margin: 2rem 0; padding: 1rem; border-left: 4px solid #3498db; }}
                h2 {{ color: #34495e; }}
                .metadata {{ color: #7f8c8d; font-size: 0.9rem; margin-bottom: 2rem; }}
            </style>
        </head>
        <body>
            <h1>{report.title}</h1>
            <div class="metadata">
                <p>Report ID: {report.report_id}</p>
                <p>Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M')}</p>
                <p>Type: {report.report_type.value}</p>
            </div>
        """
        
        for section in sorted(report.sections, key=lambda s: s.order):
            html += f"""
            <div class="section">
                <h2>{section.title}</h2>
                <div class="content">
                    <pre>{json.dumps(section.content, indent=2)}</pre>
                </div>
            </div>
            """
        
        html += """
        </body>
        </html>
        """
        
        buffer.write(html.encode())
        buffer.seek(0)
        return buffer
    
    def submit_for_approval(self, report: GeneratedReport, approvers: List[str]) -> GeneratedReport:
        """Submit report for approval workflow"""
        report.status = ReportStatus.SUBMITTED
        report.approvers = approvers
        return report
    
    def approve_report(self, report: GeneratedReport, approver_id: str) -> GeneratedReport:
        """Approve a submitted report"""
        report.status = ReportStatus.APPROVED
        report.approved_by = approver_id
        report.approved_at = datetime.utcnow()
        return report
    
    def reject_report(self, report: GeneratedReport, approver_id: str, reason: str) -> GeneratedReport:
        """Reject a submitted report with reason"""
        report.status = ReportStatus.REJECTED
        report.data['rejection_reason'] = reason
        return report


# Initialize report generator instance
report_generator = ReportGenerator()
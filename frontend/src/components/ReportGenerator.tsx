/**
 * Phase 7: Reporting & Documentation Module
 * Frontend Report Generator Component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  FilePresent as WordIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  HowToReg as HowToRegIcon,
} from '@mui/icons-material';

enum ReportType {
  FEASIBILITY = 'feasibility',
  COST_ESTIMATE = 'cost_estimate',
  TENDER_DOCUMENTATION = 'tender_documentation',
  CONSTRUCTION_METHODOLOGY = 'construction_methodology',
  COMPLIANCE = 'compliance',
  SCHEDULE = 'schedule',
  RISK_ASSESSMENT = 'risk_assessment',
}

enum ReportFormat {
  PDF = 'pdf',
  WORD = 'docx',
  EXCEL = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html',
}

enum ReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

interface ReportSection {
  section_id: string;
  title: string;
  content: any;
  order: number;
  visible: boolean;
  required: boolean;
}

interface ReportTemplate {
  template_id: string;
  name: string;
  report_type: ReportType;
  country_code?: string;
  version: string;
  sections: ReportSection[];
}

interface GeneratedReport {
  report_id: string;
  project_id: string;
  template_id: string;
  title: string;
  report_type: ReportType;
  status: ReportStatus;
  format: ReportFormat;
  generated_by: string;
  generated_at: string;
  sections: ReportSection[];
}

const ReportGenerator: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ReportFormat>(ReportFormat.PDF);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [reportData, setReportData] = useState<Record<string, any>>({});

  const steps = ['Select Template', 'Configure Report', 'Preview', 'Export & Approve'];

  const reportTypeLabels: Record<ReportType, string> = {
    [ReportType.FEASIBILITY]: 'Feasibility Report',
    [ReportType.COST_ESTIMATE]: 'Cost Estimate',
    [ReportType.TENDER_DOCUMENTATION]: 'Tender Documentation',
    [ReportType.CONSTRUCTION_METHODOLOGY]: 'Construction Methodology',
    [ReportType.COMPLIANCE]: 'Compliance Report',
    [ReportType.SCHEDULE]: 'Schedule Report',
    [ReportType.RISK_ASSESSMENT]: 'Risk Assessment',
  };

  const statusColors: Record<ReportStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    [ReportStatus.DRAFT]: 'default',
    [ReportStatus.SUBMITTED]: 'primary',
    [ReportStatus.UNDER_REVIEW]: 'warning',
    [ReportStatus.APPROVED]: 'success',
    [ReportStatus.REJECTED]: 'error',
  };

  useEffect(() => {
    // Load templates from API
    const loadTemplates = async () => {
      // Mock data - would fetch from /api/reports/templates
      const mockTemplates: ReportTemplate[] = [
        {
          template_id: 'feasibility_standard',
          name: 'Standard Feasibility Report',
          report_type: ReportType.FEASIBILITY,
          version: '1.0.0',
          sections: [
            { section_id: 'executive_summary', title: 'Executive Summary', content: '', order: 1, visible: true, required: true },
            { section_id: 'project_overview', title: 'Project Overview', content: '', order: 2, visible: true, required: true },
            { section_id: 'site_assessment', title: 'Site Assessment', content: '', order: 3, visible: true, required: false },
            { section_id: 'recommendations', title: 'Recommendations', content: '', order: 9, visible: true, required: true },
            { section_id: 'conclusion', title: 'Conclusion', content: '', order: 10, visible: true, required: true },
          ],
        },
        {
          template_id: 'cost_estimate_standard',
          name: 'Standard Cost Estimate Report',
          report_type: ReportType.COST_ESTIMATE,
          version: '1.0.0',
          sections: [
            { section_id: 'summary', title: 'Cost Summary', content: '', order: 1, visible: true, required: true },
            { section_id: 'assumptions', title: 'Estimation Assumptions', content: '', order: 2, visible: true, required: true },
            { section_id: 'materials_breakdown', title: 'Materials Breakdown', content: '', order: 3, visible: true, required: false },
            { section_id: 'total_cost', title: 'Total Project Cost', content: '', order: 8, visible: true, required: true },
          ],
        },
      ];
      setTemplates(mockTemplates);
    };
    
    loadTemplates();
  }, []);

  const selectedTemplateData = templates.find(t => t.template_id === selectedTemplate);

  const handleGenerateReport = async () => {
    // Mock API call to /api/reports/generate
    const mockReport: GeneratedReport = {
      report_id: `report_${Date.now()}`,
      project_id: 'project_123',
      template_id: selectedTemplate,
      title: selectedTemplateData?.name || 'Generated Report',
      report_type: selectedTemplateData?.report_type || ReportType.FEASIBILITY,
      status: ReportStatus.DRAFT,
      format: exportFormat,
      generated_by: 'current_user',
      generated_at: new Date().toISOString(),
      sections: selectedTemplateData?.sections.map(s => ({
        ...s,
        content: reportData[s.section_id] || 'Sample content for ' + s.title,
      })) || [],
    };

    setGeneratedReport(mockReport);
    setActiveStep(2);
  };

  const handleExport = async () => {
    // API call to /api/reports/export
    alert(`Exporting report as ${exportFormat.toUpperCase()}`);
  };

  const handleSubmitForApproval = async () => {
    if (generatedReport) {
      setGeneratedReport({
        ...generatedReport,
        status: ReportStatus.SUBMITTED,
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Report Generator
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Generate professional engineering reports, documentation and export to multiple formats
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>Select Report Template</Typography>
          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} lg={4} key={template.template_id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedTemplate === template.template_id ? 2 : 1,
                    borderColor: selectedTemplate === template.template_id ? 'primary.main' : 'divider',
                    '&:hover': { boxShadow: 2 }
                  }}
                  onClick={() => setSelectedTemplate(template.template_id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{template.name}</Typography>
                    </Box>
                    <Chip 
                      label={reportTypeLabels[template.report_type]} 
                      size="small" 
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {template.sections.length} sections
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Version {template.version}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={!selectedTemplate}
              onClick={() => setActiveStep(1)}
            >
              Continue
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Configure Report</Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportFormat}
                  label="Export Format"
                  onChange={(e) => setExportFormat(e.target.value as ReportFormat)}
                >
                  <MenuItem value={ReportFormat.PDF}><PdfIcon sx={{ mr: 1 }} /> PDF Document</MenuItem>
                  <MenuItem value={ReportFormat.WORD}><WordIcon sx={{ mr: 1 }} /> Microsoft Word</MenuItem>
                  <MenuItem value={ReportFormat.EXCEL}><ExcelIcon sx={{ mr: 1 }} /> Microsoft Excel</MenuItem>
                  <MenuItem value={ReportFormat.CSV}>CSV Spreadsheet</MenuItem>
                  <MenuItem value={ReportFormat.HTML}>HTML Document</MenuItem>
                  <MenuItem value={ReportFormat.JSON}>JSON Data</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Report Sections</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Section</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Order</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedTemplateData?.sections.sort((a,b) => a.order - b.order).map((section) => (
                    <TableRow key={section.section_id}>
                      <TableCell>{section.title}</TableCell>
                      <TableCell>
                        {section.required ? 
                          <Chip label="Required" size="small" color="primary" /> : 
                          <Chip label="Optional" size="small" />
                        }
                      </TableCell>
                      <TableCell align="right">{section.order}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(0)}>Back</Button>
            <Button
              variant="contained"
              onClick={handleGenerateReport}
            >
              Generate Report
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && generatedReport && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Report Preview</Typography>
            <Chip 
              label={generatedReport.status.toUpperCase()} 
              color={statusColors[generatedReport.status]}
            />
          </Box>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>{generatedReport.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Report ID: {generatedReport.report_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generated: {new Date(generatedReport.generated_at).toLocaleString()}
            </Typography>
            
            <Divider sx={{ my: 3 }} />

            {generatedReport.sections.sort((a,b) => a.order - b.order).map((section) => (
              <Box key={section.section_id} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{section.title}</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(section.content, null, 2)}
                </Typography>
              </Box>
            ))}
          </Paper>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(1)}>Back</Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep(3)}
            >
              Continue to Export
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 3 && generatedReport && (
        <Box>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab label="Export" />
            <Tab label="Approval Workflow" />
          </Tabs>

          {activeTab === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Export Report</Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    onClick={handleExport}
                  >
                    Export PDF
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<WordIcon />}
                    onClick={handleExport}
                  >
                    Export Word
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<ExcelIcon />}
                    onClick={handleExport}
                  >
                    Export Excel
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                  >
                    Download
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {activeTab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Approval Workflow</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<ScheduleIcon />}
                  onClick={handleSubmitForApproval}
                  disabled={generatedReport.status !== ReportStatus.DRAFT}
                >
                  Submit for Approval
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HowToRegIcon />}
                  disabled={generatedReport.status !== ReportStatus.SUBMITTED}
                >
                  Approve Report
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={generatedReport.status !== ReportStatus.SUBMITTED}
                >
                  Reject Report
                </Button>
              </Box>

              {generatedReport.status !== ReportStatus.DRAFT && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2">Current Status:</Typography>
                  <Chip 
                    label={generatedReport.status.toUpperCase()} 
                    color={statusColors[generatedReport.status]}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Paper>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(2)}>Back</Button>
            <Button
              variant="contained"
              onClick={() => {
                setActiveStep(0);
                setGeneratedReport(null);
                setSelectedTemplate('');
              }}
            >
              Generate New Report
            </Button>
          </Box>
        </Box>
      )}

    </Box>
  );
};

export default ReportGenerator;
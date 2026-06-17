import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ReportSection {
  section_id: string;
  title: string;
  order: number;
  required: boolean;
}

interface ReportTemplate {
  template_id: string;
  name: string;
  report_type: string;
  version: string;
  sections: ReportSection[];
}

interface GeneratedReport {
  id: string;
  title: string;
  report_type: string;
  status: string;
  format: string;
  created_at: string;
}

const FORMATS = ['json', 'csv', 'html'] as const;
type Format = typeof FORMATS[number];

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STEPS = ['Select Template', 'Configure', 'Preview', 'Export & Approve'];

export default function ReportGenerator() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [exportFormat, setExportFormat] = useState<Format>('json');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'approval'>('export');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    api.getReportTemplates()
      .then(setTemplates)
      .catch(() => setTemplatesError('Failed to load templates. Please refresh the page.'))
      .finally(() => setTemplatesLoading(false));
    api.getReports().then(r => setReports(r.data)).catch(() => {});
  }, []);

  const selectedTemplate = templates.find(t => t.template_id === selectedTemplateId);

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setSaving(true);
    setError(null);
    try {
      const report = await api.createReport({
        title: selectedTemplate.name,
        report_type: selectedTemplate.report_type,
        format: exportFormat,
        content: { template_id: selectedTemplateId },
      });
      setGeneratedReport(report);
      setReports(prev => [report, ...prev]);
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to generate report.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!generatedReport) return;
    try {
      const updated = await api.updateReportStatus(generatedReport.id, 'submitted');
      setGeneratedReport(prev => prev ? { ...prev, status: updated.status } : prev);
    } catch {
      setError('Failed to submit report.');
    }
  }

  function reset() {
    setStep(0);
    setGeneratedReport(null);
    setSelectedTemplateId('');
    setActiveTab('export');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
        <p className="text-gray-500 mt-1">Generate professional engineering reports and export to multiple formats</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                i < step ? 'bg-blue-600 border-blue-600 text-white' :
                i === step ? 'border-blue-600 text-blue-600' :
                'border-gray-300 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-16 mx-1 mb-5 ${i < step ? 'bg-blue-600' : 'bg-gray-300'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Select Template */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Select a Report Template</h2>
          {templatesError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{templatesError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesLoading && (
              <div className="col-span-3 flex items-center gap-2 text-gray-400 text-sm py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                Loading templates…
              </div>
            )}
            {templates.map(t => (
              <button
                key={t.template_id}
                onClick={() => setSelectedTemplateId(t.template_id)}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedTemplateId === t.template_id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-blue-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{t.report_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.sections.length} sections · v{t.version}</p>
                  </div>
                </div>
              </button>
            ))}
            {!templatesLoading && templates.length === 0 && !templatesError && (
              <p className="text-gray-400 text-sm col-span-3">No templates available.</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              disabled={!selectedTemplateId}
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Configure */}
      {step === 1 && selectedTemplate && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Configure Report</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Export Format</label>
            <select
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as Format)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FORMATS.map(f => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              Report Sections
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Section</th>
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Required</th>
                  <th className="text-right py-2 px-4 text-gray-500 font-medium">Order</th>
                </tr>
              </thead>
              <tbody>
                {[...selectedTemplate.sections].sort((a, b) => a.order - b.order).map(s => (
                  <tr key={s.section_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-4 text-gray-900">{s.title}</td>
                    <td className="py-2 px-4">
                      {s.required
                        ? <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Required</span>
                        : <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Optional</span>
                      }
                    </td>
                    <td className="py-2 px-4 text-right text-gray-500">{s.order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={handleGenerate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && generatedReport && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[generatedReport.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {generatedReport.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <h3 className="text-xl font-semibold text-gray-900">{generatedReport.title}</h3>
            <div className="text-sm text-gray-500 space-y-1">
              <p>ID: {generatedReport.id}</p>
              <p>Generated: {new Date(generatedReport.created_at).toLocaleString()}</p>
              <p>Format: {generatedReport.format.toUpperCase()}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-600">Report created successfully. Configure content sections and proceed to export.</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Continue to Export
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Export & Approve */}
      {step === 3 && generatedReport && (
        <div className="space-y-4">
          <div className="flex border-b border-gray-200">
            {(['export', 'approval'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'export' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-base font-medium text-gray-900">Export Report</h3>
              <div className="flex flex-wrap gap-3">
                {FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      const slug = generatedReport?.title.replace(/\s+/g, '_') ?? 'report';
                      if (f === 'json') {
                        downloadBlob(
                          JSON.stringify(generatedReport, null, 2),
                          `${slug}.json`,
                          'application/json'
                        );
                      } else if (f === 'csv') {
                        const rows = [
                          ['Field', 'Value'],
                          ['ID', generatedReport?.id ?? ''],
                          ['Title', generatedReport?.title ?? ''],
                          ['Type', generatedReport?.report_type ?? ''],
                          ['Status', generatedReport?.status ?? ''],
                          ['Format', generatedReport?.format ?? ''],
                          ['Created', generatedReport?.created_at ?? ''],
                        ];
                        downloadBlob(
                          rows.map(r => r.join(',')).join('\n'),
                          `${slug}.csv`,
                          'text/csv'
                        );
                      } else if (f === 'html') {
                        const html = `<!DOCTYPE html><html><head><title>${generatedReport?.title}</title></head><body><h1>${generatedReport?.title}</h1><p>Type: ${generatedReport?.report_type}</p><p>Status: ${generatedReport?.status}</p><p>Generated: ${generatedReport?.created_at}</p></body></html>`;
                        downloadBlob(html, `${slug}.html`, 'text/html');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export {f.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / PDF
                </button>
              </div>
            </div>
          )}

          {activeTab === 'approval' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-base font-medium text-gray-900">Approval Workflow</h3>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[generatedReport.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {generatedReport.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={generatedReport.status !== 'draft'}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
                >
                  Submit for Approval
                </button>
                <button
                  disabled={generatedReport.status !== 'submitted'}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  disabled={generatedReport.status !== 'submitted'}
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Generate New Report
            </button>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      {reports.length > 0 && step === 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Reports</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Title</th>
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-4 text-gray-500 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium text-gray-900">{r.title}</td>
                    <td className="py-2 px-4 text-gray-600 capitalize">{r.report_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

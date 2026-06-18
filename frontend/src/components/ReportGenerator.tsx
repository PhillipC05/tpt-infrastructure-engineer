import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
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
interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  format: string;
  project_id: string | null;
  project_name?: string;
  created_at: string;
  updated_at?: string;
  content?: Record<string, any>;
}
interface Project { id: string; name: string; project_number?: string; }

type View = 'library' | 'create' | 'report';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  submitted:   'bg-blue-100 text-blue-700',
  under_review:'bg-yellow-100 text-yellow-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100  text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  feasibility:          'Feasibility',
  cost_estimate:        'Cost Estimate',
  tender_documentation: 'Tender',
  risk_assessment:      'Risk Assessment',
  compliance:           'Compliance',
  trade_breakdown:      'Trade Breakdown',
};

// ── Section content renderers ─────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function RiskTable({ risks }: { risks: any[] }) {
  const ratingColor: Record<string, string> = {
    High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-green-100 text-green-700',
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {['ID', 'Risk', 'Likelihood', 'Consequence', 'Rating', 'Mitigation'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {risks.map((r: any) => (
            <tr key={r.id} className="border-b border-gray-100">
              <td className="py-2 px-3 text-gray-500 font-mono text-xs">{r.id}</td>
              <td className="py-2 px-3 text-gray-900">{r.description}</td>
              <td className="py-2 px-3 text-gray-600">{r.likelihood}</td>
              <td className="py-2 px-3 text-gray-600">{r.consequence}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ratingColor[r.rating] ?? 'bg-gray-100 text-gray-600'}`}>{r.rating}</span>
              </td>
              <td className="py-2 px-3 text-gray-600 text-xs">{r.mitigation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstimateTable({ items, total, label }: { items: any[]; total: number; label?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No estimate items match this category for the selected project.</p>;
  }
  return (
    <div>
      {label && <p className="text-xs text-gray-400 mb-2">{label}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Qty</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Unit</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Rate</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2 px-3 text-gray-900">{item.description}</td>
                <td className="py-2 px-3 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2 px-3 text-gray-500">{item.unit}</td>
                <td className="py-2 px-3 text-right text-gray-600">${fmt(item.rate)}</td>
                <td className="py-2 px-3 text-right font-medium">${fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="py-2 px-3 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="py-2 px-3 text-right font-bold text-gray-900">${fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CostSummary({ data }: { data: any }) {
  const { total = 0, by_category = {}, item_count = 0 } = data;
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-4 flex-1">
          <p className="text-xs text-blue-600 font-medium">Total Estimated Cost</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">${fmt(total)}</p>
          <p className="text-xs text-blue-500 mt-0.5">{item_count} line item{item_count !== 1 ? 's' : ''}</p>
        </div>
        {Object.keys(by_category).length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-5 py-4 flex-1">
            <p className="text-xs text-gray-500 font-medium mb-2">By Category</p>
            {Object.entries(by_category).map(([cat, val]: any) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-gray-700">{cat}</span>
                <span className="font-medium">${fmt(val.subtotal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {data.items?.length > 0 && <EstimateTable items={data.items} total={total} />}
    </div>
  );
}

function ScheduleTable({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400 italic">No schedule tasks found for this project.</p>;
  }
  const statusColor: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-green-100 text-green-700',
    on_hold:     'bg-amber-100 text-amber-700',
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Task</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Start</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">End</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Duration</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t: any, i: number) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-2 px-3 text-gray-900 font-medium">{t.name}</td>
              <td className="py-2 px-3 text-gray-600">{t.start_date}</td>
              <td className="py-2 px-3 text-gray-600">{t.end_date}</td>
              <td className="py-2 px-3 text-gray-500">{t.duration ? `${t.duration}d` : '—'}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {(t.status || '—').replace(/_/g, ' ')}
                </span>
              </td>
              <td className="py-2 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progress ?? 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{t.progress ?? 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ items }: { items: any[] }) {
  const statusIcon: Record<string, string> = {
    done:    '✅', pending: '⬜', na: '—',
  };
  return (
    <div className="space-y-2">
      {items.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span>{statusIcon[item.status] ?? '⬜'}</span>
          <span className={item.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}>{item.item}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectInfoCard({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {fields.map(f => (
        <div key={f.label}>
          <p className="text-xs text-gray-500 font-medium">{f.label}</p>
          <p className="text-sm text-gray-900 mt-0.5 break-all">{f.value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

function SectionContent({ sectionId, data }: { sectionId: string; data: any }) {
  if (!data) return <p className="text-sm text-gray-400 italic">No content available.</p>;

  switch (data.type) {
    case 'text':
      return (
        <div className="space-y-3">
          {(data.paragraphs || []).map((p: string, i: number) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>
          ))}
        </div>
      );
    case 'project_info':
      return <ProjectInfoCard fields={data.fields || []} />;
    case 'cost_summary':
      return <CostSummary data={data} />;
    case 'estimate_table':
      return <EstimateTable items={data.items || []} total={data.total ?? 0} label={data.label} />;
    case 'schedule_table':
      return <ScheduleTable tasks={data.tasks || []} />;
    case 'risk_table':
      return <RiskTable risks={data.risks || []} />;
    case 'checklist':
      return <Checklist items={data.items || []} />;
    default:
      return <p className="text-sm text-gray-400 italic">Unknown section type: {data.type}</p>;
  }
}

// ── HTML export builder ───────────────────────────────────────────────────────
function buildHtmlExport(report: Report, sections: ReportSection[]): string {
  const content = report.content || {};
  const sectionContents = content.sections || {};

  const sectionHtml = sections
    .filter(s => sectionContents[s.section_id])
    .map(s => {
      const d = sectionContents[s.section_id];
      let body = '';

      if (d.type === 'text') {
        body = (d.paragraphs || []).map((p: string) => `<p>${p}</p>`).join('\n');
      } else if (d.type === 'project_info') {
        body = `<table><tbody>${(d.fields || []).map((f: any) =>
          `<tr><th>${f.label}</th><td>${f.value || '—'}</td></tr>`
        ).join('')}</tbody></table>`;
      } else if (d.type === 'cost_summary' || d.type === 'estimate_table') {
        const items = d.items || [];
        const total = d.total ?? 0;
        body = `<table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>${items.map((i: any) => `<tr>
            <td>${i.description}</td>
            <td style="text-align:right">${i.quantity}</td>
            <td>${i.unit}</td>
            <td style="text-align:right">$${fmt(i.rate ?? i.unit_price ?? 0)}</td>
            <td style="text-align:right">$${fmt(i.amount ?? i.total ?? 0)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="4"><strong>Total</strong></td><td style="text-align:right"><strong>$${fmt(total)}</strong></td></tr></tfoot>
        </table>`;
      } else if (d.type === 'schedule_table') {
        body = `<table>
          <thead><tr><th>Task</th><th>Start</th><th>End</th><th>Duration</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>${(d.tasks || []).map((t: any) => `<tr>
            <td>${t.name}</td><td>${t.start_date}</td><td>${t.end_date}</td>
            <td>${t.duration ? t.duration + 'd' : '—'}</td>
            <td>${(t.status || '—').replace(/_/g, ' ')}</td>
            <td>${t.progress ?? 0}%</td>
          </tr>`).join('')}</tbody>
        </table>`;
      } else if (d.type === 'risk_table') {
        body = `<table>
          <thead><tr><th>ID</th><th>Risk</th><th>Likelihood</th><th>Consequence</th><th>Rating</th><th>Mitigation</th></tr></thead>
          <tbody>${(d.risks || []).map((r: any) => `<tr>
            <td>${r.id}</td><td>${r.description}</td><td>${r.likelihood}</td>
            <td>${r.consequence}</td><td>${r.rating}</td><td>${r.mitigation}</td>
          </tr>`).join('')}</tbody>
        </table>`;
      } else if (d.type === 'checklist') {
        body = `<ul>${(d.items || []).map((i: any) =>
          `<li>[${i.status === 'done' ? '✓' : ' '}] ${i.item}</li>`
        ).join('')}</ul>`;
      }

      return `<section>
        <h2>${s.title}</h2>
        ${body || '<p><em>No content available.</em></p>'}
      </section>`;
    }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${report.title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:40px;max-width:1100px;margin:0 auto}
    h1{font-size:22px;font-weight:700;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:10px;margin-bottom:6px}
    .meta{font-size:11px;color:#6b7280;margin-bottom:32px;display:flex;gap:24px}
    section{margin:28px 0}
    h2{font-size:15px;font-weight:600;color:#1e3a5f;border-left:4px solid #2563eb;padding-left:10px;margin-bottom:12px}
    p{margin-bottom:8px;line-height:1.6;color:#374151}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th{background:#f1f5f9;text-align:left;padding:7px 10px;font-weight:600;color:#374151;border:1px solid #e5e7eb}
    td{padding:6px 10px;border:1px solid #e5e7eb;color:#374151;vertical-align:top}
    tfoot td,tfoot th{background:#f8fafc;font-weight:700}
    ul{padding-left:20px;margin-top:6px}
    li{margin-bottom:4px;line-height:1.5}
    @media print{body{padding:20px}section{page-break-inside:avoid}}
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">
    <span>Type: ${TYPE_LABELS[report.report_type] ?? report.report_type}</span>
    <span>Project: ${report.project_name ?? '—'}</span>
    <span>Generated: ${new Date(report.created_at).toLocaleDateString('en-NZ')}</span>
    <span>Status: ${report.status.toUpperCase()}</span>
  </div>
  ${sectionHtml}
</body>
</html>`;
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ onReject, onClose }: { onReject: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Reject Report</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Describe why this report is being rejected…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onReject(reason)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportGenerator() {
  const [view, setView] = useState<View>('library');
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Report view state
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [approvalWorking, setApprovalWorking] = useState(false);

  const selectedTemplate = templates.find(t => t.template_id === selectedTemplateId);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const [rpt, tmpl, proj] = await Promise.all([
        api.getReports().then(r => r.data),
        api.getReportTemplates(),
        api.getProjects().then(r => r.data),
      ]);
      setReports(rpt);
      setTemplates(tmpl);
      setProjects(proj);
    } catch {
      setError('Failed to load reports. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  // When template changes, enable all sections by default and pre-fill title
  useEffect(() => {
    if (!selectedTemplate) return;
    setEnabledSections(new Set(selectedTemplate.sections.map(s => s.section_id)));
    if (!reportTitle || templates.some(t => t.name === reportTitle)) {
      setReportTitle(selectedTemplate.name);
    }
  }, [selectedTemplateId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(sectionId: string, required: boolean) {
    if (required) return;
    setEnabledSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  }

  async function handleGenerate() {
    if (!selectedProjectId || !selectedTemplate || !reportTitle.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const selectedSections = selectedTemplate.sections
        .filter(s => enabledSections.has(s.section_id))
        .sort((a, b) => a.order - b.order)
        .map(s => s.section_id);

      const report = await api.createReport({
        project_id: selectedProjectId,
        template_id: selectedTemplateId,
        title: reportTitle.trim(),
        report_type: selectedTemplate.report_type,
        selected_sections: selectedSections,
        format: 'html',
      });

      const reportWithSections = {
        ...report,
        _template_sections: selectedTemplate.sections.filter(s => selectedSections.includes(s.section_id)),
      };
      setReports(prev => [report, ...prev]);
      openReportView(reportWithSections);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  function openReportView(report: Report) {
    setOpenReport(report);
    setView('report');
    setActiveSection(null);
  }

  async function openExistingReport(id: string) {
    try {
      const full = await api.getReport(id);
      openReportView(full);
    } catch {
      setError('Failed to load report.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this report?')) return;
    await api.deleteReport(id).catch(() => {});
    setReports(prev => prev.filter(r => r.id !== id));
  }

  async function handleApprove() {
    if (!openReport) return;
    setApprovalWorking(true);
    try {
      const updated = await api.approveReport(openReport.id);
      const next = { ...openReport, status: updated.status };
      setOpenReport(next);
      setReports(prev => prev.map(r => r.id === next.id ? { ...r, status: next.status } : r));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Approve failed.');
    } finally {
      setApprovalWorking(false);
    }
  }

  async function handleReject(reason: string) {
    if (!openReport) return;
    setApprovalWorking(true);
    setShowReject(false);
    try {
      const updated = await api.rejectReport(openReport.id, reason);
      const next = { ...openReport, status: updated.status };
      setOpenReport(next);
      setReports(prev => prev.map(r => r.id === next.id ? { ...r, status: next.status } : r));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Reject failed.');
    } finally {
      setApprovalWorking(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!openReport) return;
    setApprovalWorking(true);
    try {
      const updated = await api.updateReportStatus(openReport.id, 'submitted');
      const next = { ...openReport, status: updated.status };
      setOpenReport(next);
      setReports(prev => prev.map(r => r.id === next.id ? { ...r, status: next.status } : r));
    } catch {
      setError('Failed to submit for approval.');
    } finally {
      setApprovalWorking(false);
    }
  }

  function downloadHtml() {
    if (!openReport || !selectedTemplate && !openReport.content) return;
    const content = openReport.content || {};
    const selectedSectionIds: string[] = content.selected_sections || [];
    const allSections = templates.find(t => t.template_id === content.template_id)?.sections || [];
    const sections = allSections.filter(s => selectedSectionIds.includes(s.section_id)).sort((a, b) => a.order - b.order);
    const html = buildHtmlExport(openReport, sections);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${openReport.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    if (!openReport) return;
    const blob = new Blob([JSON.stringify(openReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${openReport.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render: Library ──────────────────────────────────────────────────────
  if (view === 'library') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
            <p className="text-gray-500 mt-1">Generate and manage engineering reports for your projects</p>
          </div>
          <button
            onClick={() => { setSelectedProjectId(''); setSelectedTemplateId(''); setReportTitle(''); setEnabledSections(new Set()); setError(null); setView('create'); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            + New Report
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-gray-700">No reports yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Generate your first engineering report from a project.</p>
            <button onClick={() => setView('create')} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Create Report
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Title</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Project</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Generated</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <button onClick={() => openExistingReport(r.id)} className="font-medium text-blue-600 hover:underline text-left">
                        {r.title}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{r.project_name ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{TYPE_LABELS[r.report_type] ?? r.report_type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{new Date(r.created_at).toLocaleDateString('en-NZ')}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openExistingReport(r.id)} className="text-xs text-blue-600 hover:underline">Open</button>
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Create ───────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('library'); setError(null); }} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Report</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Select a project and template, then generate</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

        <div className="grid grid-cols-12 gap-6">
          {/* Left column: project + title + sections */}
          <div className="col-span-4 space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.project_number ? `[${p.project_number}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  placeholder="Enter report title"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Section config (only when template selected) */}
            {selectedTemplate && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sections</h2>
                  <span className="text-xs text-gray-400">{enabledSections.size}/{selectedTemplate.sections.length}</span>
                </div>
                <div className="space-y-1">
                  {[...selectedTemplate.sections].sort((a, b) => a.order - b.order).map(s => {
                    const enabled = enabledSections.has(s.section_id);
                    return (
                      <label
                        key={s.section_id}
                        className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer ${enabled ? 'hover:bg-gray-50' : 'opacity-50 hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={s.required}
                          onChange={() => toggleSection(s.section_id, s.required)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-800 flex-1">{s.title}</span>
                        {s.required && <span className="text-xs text-blue-600 font-medium">required</span>}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400">Required sections are always included.</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedProjectId || !selectedTemplateId || !reportTitle.trim()}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
          </div>

          {/* Right column: template picker */}
          <div className="col-span-8 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Choose Template</h2>
            <div className="grid grid-cols-2 gap-3">
              {templates.map(t => (
                <button
                  key={t.template_id}
                  onClick={() => setSelectedTemplateId(t.template_id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTemplateId === t.template_id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${selectedTemplateId === t.template_id ? 'text-blue-600' : 'text-gray-400'}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[t.report_type] ?? t.report_type}</p>
                      <p className="text-xs text-gray-400 mt-1">{t.sections.length} sections · v{t.version}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Report Document ──────────────────────────────────────────────
  if (view === 'report' && openReport) {
    const content = openReport.content || {};
    const selectedSectionIds: string[] = content.selected_sections || [];
    const templateMeta = templates.find(t => t.template_id === content.template_id);
    const allSections = templateMeta?.sections || [];
    const visibleSections = allSections
      .filter(s => selectedSectionIds.includes(s.section_id))
      .sort((a, b) => a.order - b.order);

    const sectionContents = content.sections || {};
    const activeSectionData = activeSection ? sectionContents[activeSection] : null;
    const activeSectionMeta = visibleSections.find(s => s.section_id === activeSection);
    const displaySection = activeSection ? activeSectionMeta : null;

    const canSubmit  = openReport.status === 'draft';
    const canApprove = openReport.status === 'submitted' || openReport.status === 'under_review';
    const canReject  = openReport.status === 'submitted' || openReport.status === 'under_review';

    return (
      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <button onClick={() => { setView('library'); setOpenReport(null); }} className="mt-1 text-gray-400 hover:text-gray-600 shrink-0">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{openReport.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[openReport.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {openReport.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500">{openReport.project_name ?? '—'}</span>
                <span className="text-xs text-gray-400">{new Date(openReport.created_at).toLocaleDateString('en-NZ')}</span>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={downloadHtml} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export HTML
            </button>
            <button onClick={downloadJson} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export JSON
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-50">
              Print / PDF
            </button>
            {canSubmit && (
              <button
                onClick={handleSubmitForApproval}
                disabled={approvalWorking}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
              >
                Submit for Approval
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={approvalWorking}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-40"
              >
                Approve
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowReject(true)}
                disabled={approvalWorking}
                className="px-3 py-1.5 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-40"
              >
                Reject
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">{error}</div>}

        {/* Rejection reason banner */}
        {openReport.status === 'rejected' && content.rejection_reason && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
            <span className="font-medium">Rejected: </span>{content.rejection_reason}
          </div>
        )}

        {/* Two-panel layout */}
        <div className="flex gap-5">
          {/* Left: section navigator */}
          <div className="w-52 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contents
              </div>
              <nav className="divide-y divide-gray-50">
                <button
                  onClick={() => setActiveSection(null)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    !activeSection ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All Sections
                </button>
                {visibleSections.map(s => (
                  <button
                    key={s.section_id}
                    onClick={() => setActiveSection(s.section_id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      activeSection === s.section_id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Right: section content */}
          <div className="flex-1 min-w-0">
            {activeSection && displaySection ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">{displaySection.title}</h2>
                <SectionContent sectionId={activeSection} data={activeSectionData} />
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSections.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
                    No sections in this report.
                  </div>
                ) : (
                  visibleSections.map(s => (
                    <div key={s.section_id} className="bg-white border border-gray-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                        <span className="text-gray-400 text-sm font-normal mr-2">{s.order}.</span>
                        {s.title}
                      </h2>
                      <SectionContent sectionId={s.section_id} data={sectionContents[s.section_id]} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {showReject && <RejectModal onReject={handleReject} onClose={() => setShowReject(false)} />}
      </div>
    );
  }

  return null;
}

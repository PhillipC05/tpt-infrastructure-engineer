import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface BOM {
  id: string;
  title: string;
  project_id: string;
  line_items: any[];
  total_value: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  project_id: string;
  supplier_name: string;
  status: string;
  total_value: number;
  line_items: any[];
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  project_number?: string;
}

const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  sent: 'bg-blue-100 text-blue-700',
  partial_delivery: 'bg-orange-100 text-orange-700',
  fully_delivered: 'bg-green-100 text-green-700',
  invoiced: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const TABS = ['Bill of Materials', 'Purchase Orders'] as const;
type Tab = typeof TABS[number];

// ── Generate BOM modal ──────────────────────────────────────────────────────
function GenerateBOMModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[];
  onClose: () => void;
  onCreated: (bom: BOM) => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const bom = await api.createBom({ project_id: projectId, title: title.trim() });
      onCreated(bom);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to generate BOM.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Generate BOM from Estimate</h2>
        <p className="text-sm text-gray-500">Pulls all estimate line items for the selected project and creates a Bill of Materials.</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              required
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                const p = projects.find(p => p.id === e.target.value);
                if (p) setTitle(`BOM — ${p.name}`);
              }}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">BOM Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Bill of Materials title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || !projectId || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Generating…' : 'Generate BOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create PO from BOM modal ────────────────────────────────────────────────
function CreatePOFromBOMModal({
  bom,
  onClose,
  onCreated,
}: {
  bom: BOM;
  onClose: () => void;
  onCreated: (po: PurchaseOrder) => void;
}) {
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const po = await api.createPoFromBom(bom.id, {
        supplier_name: supplierName.trim(),
        po_number: poNumber.trim() || undefined,
      });
      onCreated(po);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create PO.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order from BOM</h2>
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
          <p className="font-medium text-gray-800">{bom.title}</p>
          <p className="text-gray-500 mt-0.5">{bom.line_items.length} items · {formatCurrency(bom.total_value)}</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="e.g. Fulton Hogan Ltd"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number <span className="text-gray-400 font-normal">(optional — auto-generated if blank)</span></label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-001"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || !supplierName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared line-items editor ────────────────────────────────────────────────
interface LineItemDraft {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

function emptyLine(): LineItemDraft {
  return { description: '', quantity: '', unit: '', unit_price: '' };
}

function LineItemsEditor({
  lines,
  onChange,
}: {
  lines: LineItemDraft[];
  onChange: (lines: LineItemDraft[]) => void;
}) {
  function update(i: number, field: keyof LineItemDraft, val: string) {
    const next = lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    onChange(next);
  }
  function remove(i: number) { onChange(lines.filter((_, idx) => idx !== i)); }
  function add() { onChange([...lines, emptyLine()]); }

  const lineTotal = (l: LineItemDraft) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unit_price) || 0;
    return q * p;
  };
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-12 gap-1.5 items-start">
          <input
            value={l.description}
            onChange={e => update(i, 'description', e.target.value)}
            placeholder="Description"
            className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={l.quantity}
            onChange={e => update(i, 'quantity', e.target.value)}
            placeholder="Qty"
            type="number"
            min="0"
            step="any"
            className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={l.unit}
            onChange={e => update(i, 'unit', e.target.value)}
            placeholder="Unit"
            className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={l.unit_price}
            onChange={e => update(i, 'unit_price', e.target.value)}
            placeholder="Unit price"
            type="number"
            min="0"
            step="any"
            className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="col-span-1 text-xs text-gray-500 py-1.5 text-right">
            ${lineTotal(l).toFixed(2)}
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="col-span-1 text-gray-300 hover:text-red-500 text-lg leading-none py-1"
          >×</button>
        </div>
      ))}
      {lines.length > 0 && (
        <div className="grid grid-cols-12">
          <div className="col-span-10 text-right text-xs font-semibold text-gray-600 pr-2 py-1">Total</div>
          <div className="col-span-1 text-xs font-bold text-gray-800">${grandTotal.toFixed(2)}</div>
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="text-xs text-blue-600 hover:underline mt-1"
      >
        + Add line item
      </button>
    </div>
  );
}

// ── Create PO (manual) modal ────────────────────────────────────────────────
function CreatePOModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: Project[];
  onClose: () => void;
  onCreated: (po: PurchaseOrder) => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [lines, setLines] = useState<LineItemDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalValue = lines.reduce((s, l) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unit_price) || 0;
    return s + q * p;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !supplierName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const lineItems = lines
        .filter(l => l.description.trim())
        .map(l => ({
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 0,
          unit: l.unit.trim() || 'each',
          unit_price: parseFloat(l.unit_price) || 0,
          total: (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0),
        }));

      const po = await api.createPurchaseOrder({
        project_id: projectId,
        supplier_name: supplierName.trim(),
        po_number: poNumber.trim() || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        status: 'draft',
        total_value: totalValue,
        line_items: lineItems,
      });
      onCreated(po);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create purchase order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
              <select
                required
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="e.g. Higgins Contractors Ltd"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number <span className="text-gray-400 font-normal">(optional — auto-generated if blank)</span></label>
            <input
              type="text"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-001"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <span className="text-xs text-gray-400">Description · Qty · Unit · Unit Price → Total</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <LineItemsEditor lines={lines} onChange={setLines} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || !projectId || !supplierName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? 'Creating…' : `Create PO${totalValue > 0 ? ` — $${totalValue.toFixed(2)}` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── BOM detail modal ────────────────────────────────────────────────────────
function BOMDetailModal({ bom, onClose }: { bom: BOM; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{bom.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{bom.line_items.length} items · Created {new Date(bom.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {bom.line_items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No line items. Add estimate items to this project first.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Qty</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Unit</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Unit Price</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {bom.line_items.map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900">{item.description}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 px-3 text-gray-600">{item.unit}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-2 px-3 text-right text-sm font-semibold text-gray-700">Total</td>
                <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(bom.total_value)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ── PO detail modal ─────────────────────────────────────────────────────────
function PODetailModal({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{po.po_number}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Supplier: {po.supplier_name} · Status: {po.status.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {po.line_items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No line items on this purchase order.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Qty</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Unit</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Unit Price</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.line_items.map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900">{item.description}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 px-3 text-gray-600">{item.unit}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-2 px-3 text-right text-sm font-semibold text-gray-700">Total</td>
                <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(po.total_value)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProcurementManager() {
  const [activeTab, setActiveTab] = useState<Tab>('Bill of Materials');
  const [boms, setBoms] = useState<BOM[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showGenerateBOM, setShowGenerateBOM] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [bomForPO, setBomForPO] = useState<BOM | null>(null);
  const [viewBOM, setViewBOM] = useState<BOM | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getBoms().then(r => r.data).catch(() => []),
      api.getPurchaseOrders().then(r => r.data).catch(() => []),
      api.getProjects().then(r => r.data).catch(() => []),
    ]).then(([b, po, proj]) => {
      setBoms(b);
      setPurchaseOrders(po);
      setProjects(proj);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalBOMValue = boms.reduce((s, b) => s + b.total_value, 0);
  const totalPOValue = purchaseOrders.reduce((s, p) => s + p.total_value, 0);
  const approvedPOs = purchaseOrders.filter(p => ['approved', 'sent', 'partial_delivery', 'fully_delivered', 'paid'].includes(p.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Manager</h1>
        <p className="text-gray-500 mt-1">Manage Bill of Materials, Purchase Orders and Budget Tracking</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Total BOM Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBOMValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{boms.length} bill{boms.length !== 1 ? 's' : ''} of materials</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Total PO Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPOValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{purchaseOrders.length} purchase order{purchaseOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-500">Approved POs</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedPOs}</p>
          <p className="text-xs text-gray-400 mt-1">of {purchaseOrders.length} total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : activeTab === 'Bill of Materials' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Bills of Materials</h2>
            <button
              onClick={() => setShowGenerateBOM(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Generate BOM from Estimate
            </button>
          </div>

          {boms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
              No bills of materials yet. Generate one from an estimate to get started.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Title</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Items</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Value</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map(bom => (
                    <tr key={bom.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{bom.title}</td>
                      <td className="py-3 px-4 text-gray-600">{bom.line_items.length}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(bom.total_value)}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(bom.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewBOM(bom)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setBomForPO(bom)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Create PO
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Purchase Orders</h2>
            <button
              onClick={() => setShowCreatePO(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Create Purchase Order
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
              No purchase orders yet.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">PO Number</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Supplier</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Value</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{po.po_number}</td>
                      <td className="py-3 px-4 text-gray-600">{po.supplier_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PO_STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(po.total_value)}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewPO(po)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showGenerateBOM && (
        <GenerateBOMModal
          projects={projects}
          onClose={() => setShowGenerateBOM(false)}
          onCreated={bom => {
            setBoms(prev => [bom, ...prev]);
            setShowGenerateBOM(false);
          }}
        />
      )}

      {bomForPO && (
        <CreatePOFromBOMModal
          bom={bomForPO}
          onClose={() => setBomForPO(null)}
          onCreated={po => {
            setPurchaseOrders(prev => [po, ...prev]);
            setBomForPO(null);
            setActiveTab('Purchase Orders');
          }}
        />
      )}

      {showCreatePO && (
        <CreatePOModal
          projects={projects}
          onClose={() => setShowCreatePO(false)}
          onCreated={po => {
            setPurchaseOrders(prev => [po, ...prev]);
            setShowCreatePO(false);
          }}
        />
      )}

      {viewBOM && <BOMDetailModal bom={viewBOM} onClose={() => setViewBOM(null)} />}
      {viewPO && <PODetailModal po={viewPO} onClose={() => setViewPO(null)} />}
    </div>
  );
}

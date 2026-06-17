import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDate, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

interface Project {
  id: string;
  name: string;
  description: string;
  project_number: string;
  client_name: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  budget: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  name: '',
  project_number: '',
  client_name: '',
  status: 'draft' as 'draft' | 'active',
  description: '',
  budget: '',
  start_date: '',
  end_date: '',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'draft'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { data } = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.createProject({
        name: form.name.trim(),
        project_number: form.project_number || undefined,
        client_name: form.client_name || undefined,
        description: form.description || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      await loadProjects();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail ?? 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.client_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (project.project_number ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || project.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage all infrastructure projects</p>
        </div>
        <Button variant="primary" onClick={openModal}>New Project</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'completed', 'draft'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{project.project_number} • {project.client_name}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Budget</p>
                  <p className="font-medium">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Updated</p>
                  <p className="font-medium">{formatDate(project.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No projects found</p>
            <Button variant="primary" onClick={openModal}>Create your first project</Button>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bridge Rehabilitation"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project No.</label>
                <input
                  type="text"
                  value={form.project_number}
                  onChange={e => setForm(f => ({ ...f, project_number: e.target.value }))}
                  placeholder="e.g. PRJ-001"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Client name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'active' }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief project description..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

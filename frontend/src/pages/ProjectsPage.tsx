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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'draft'>('all');

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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
                          project.client_name.toLowerCase().includes(search.toLowerCase()) ||
                          project.project_number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || project.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <Button variant="primary">New Project</Button>
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
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
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
            <Button variant="primary">Create your first project</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
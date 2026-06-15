import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { api } from '../lib/api';

interface ScheduleTask {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  dependencies: string[];
  assignee?: string;
}

interface Project {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects(0, 100).then(({ data }) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    api.getProjectTasks(selectedProjectId)
      .then(setTasks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const statusColors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delayed: 'bg-red-100 text-red-700',
  };

  const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
  const projectStart = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const projectEnd = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));

  function getTaskPosition(task: ScheduleTask) {
    const start = new Date(task.start_date);
    const offset = Math.max(0, Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
    const width = (task.duration / totalDays) * 100;
    const left = (offset / totalDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  }

  const overallProgress = tasks.length
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Schedule</h1>
          <p className="text-gray-500 mt-1">Gantt chart and task schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="primary">Add Task</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overall Progress</p>
            <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${overallProgress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Tasks Completed</p>
            <p className="text-2xl font-bold text-gray-900">
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Timeline</p>
            <p className="text-2xl font-bold text-gray-900">{totalDays} days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gantt Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {selectedProjectId
                ? 'No tasks for this project yet.'
                : 'Select a project to view its schedule.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[300px_1fr] gap-4 border-b pb-2 mb-2">
                  <div className="text-sm font-medium text-gray-500">Task</div>
                  <div className="text-sm font-medium text-gray-500 text-center">Timeline</div>
                </div>
                {tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-[300px_1fr] gap-4 py-2 items-center border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{task.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(task.start_date)} – {formatDate(task.end_date)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded">
                      <div
                        className="absolute top-1 bottom-1 bg-blue-600 rounded flex items-center justify-center text-xs text-white overflow-hidden"
                        style={getTaskPosition(task)}
                      >
                        {task.progress > 0 && (
                          <div className="absolute inset-y-0 left-0 bg-blue-800 rounded-l" style={{ width: `${task.progress}%` }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

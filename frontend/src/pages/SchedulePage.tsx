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

const EMPTY_TASK = {
  name: '',
  start_date: '',
  end_date: '',
  duration: '',
  assignee: '',
  status: 'not_started' as const,
};

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

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

  function openModal() {
    setTaskForm(EMPTY_TASK);
    setTaskError(null);
    setShowModal(true);
  }

  async function handleAddTask() {
    if (!taskForm.name.trim()) {
      setTaskError('Task name is required.');
      return;
    }
    if (!taskForm.start_date || !taskForm.end_date) {
      setTaskError('Start date and end date are required.');
      return;
    }
    if (taskForm.end_date < taskForm.start_date) {
      setTaskError('End date must be on or after start date.');
      return;
    }
    setSaving(true);
    setTaskError(null);
    try {
      const start = new Date(taskForm.start_date);
      const end = new Date(taskForm.end_date);
      const duration = taskForm.duration
        ? parseInt(taskForm.duration)
        : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      await api.createProjectTask(selectedProjectId, {
        name: taskForm.name.trim(),
        start_date: taskForm.start_date,
        end_date: taskForm.end_date,
        duration,
        status: taskForm.status,
        assignee: taskForm.assignee || undefined,
        progress: 0,
        dependencies: [],
      });
      setShowModal(false);
      setTaskForm(EMPTY_TASK);
      const updated = await api.getProjectTasks(selectedProjectId);
      setTasks(updated);
    } catch (e: any) {
      setTaskError(e?.response?.data?.detail ?? 'Failed to add task.');
    } finally {
      setSaving(false);
    }
  }

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
          <Button
            variant="primary"
            onClick={openModal}
            disabled={!selectedProjectId}
          >
            Add Task
          </Button>
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
                ? 'No tasks for this project yet. Click "Add Task" to get started.'
                : 'Select a project to view its schedule.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-200">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Task</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {taskError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{taskError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Foundation Survey"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={taskForm.start_date}
                    onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={taskForm.end_date}
                    onChange={e => setTaskForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={taskForm.duration}
                    onChange={e => setTaskForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="Auto-calculated"
                    min="1"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={e => setTaskForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <input
                  type="text"
                  value={taskForm.assignee}
                  onChange={e => setTaskForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onClick={handleAddTask}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

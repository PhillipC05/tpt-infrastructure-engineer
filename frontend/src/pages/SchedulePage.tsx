import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';

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

export default function SchedulePage() {
  const [tasks, setTasks] = useState<ScheduleTask[]>([
    { id: '1', name: 'Site Investigation & Survey', start_date: '2026-04-01', end_date: '2026-04-10', duration: 10, progress: 100, status: 'completed', dependencies: [] },
    { id: '2', name: 'Earthworks & Site Preparation', start_date: '2026-04-11', end_date: '2026-04-25', duration: 15, progress: 75, status: 'in_progress', dependencies: ['1'], assignee: 'Civil Works Team' },
    { id: '3', name: 'Substructure & Foundations', start_date: '2026-04-26', end_date: '2026-05-15', duration: 20, progress: 0, status: 'not_started', dependencies: ['2'], assignee: 'Concrete Crew' },
    { id: '4', name: 'Structural Steel Erection', start_date: '2026-05-16', end_date: '2026-06-05', duration: 21, progress: 0, status: 'not_started', dependencies: ['3'] },
    { id: '5', name: 'Drainage & Services', start_date: '2026-04-20', end_date: '2026-05-20', duration: 31, progress: 20, status: 'in_progress', dependencies: ['1'] },
    { id: '6', name: 'Pavement Construction', start_date: '2026-06-06', end_date: '2026-06-25', duration: 20, progress: 0, status: 'not_started', dependencies: ['4'] },
  ]);

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delayed: 'bg-red-100 text-red-700',
  };

  const projectStart = new Date('2026-04-01');
  const projectEnd = new Date('2026-07-01');
  const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  function getTaskPosition(task: ScheduleTask) {
    const start = new Date(task.start_date);
    const offset = Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    const width = (task.duration / totalDays) * 100;
    const left = (offset / totalDays) * 100;
    return { left: `${left}%`, width: `${width}%` };
  }

  const overallProgress = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Schedule</h1>
          <p className="text-gray-500 mt-1">Gantt chart and critical path schedule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Excel</Button>
          <Button variant="primary">Add Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overall Progress</p>
            <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Tasks Completed</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.status === 'completed').length} / {tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Project Timeline</p>
            <p className="text-2xl font-bold text-gray-900">{totalDays} days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gantt Chart</CardTitle>
        </CardHeader>
        <CardContent>
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
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(task.start_date)} - {formatDate(task.end_date)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded">
                    <div
                      className="absolute top-1 bottom-1 bg-blue-600 rounded flex items-center justify-center text-xs text-white"
                      style={getTaskPosition(task)}
                    >
                      {task.progress > 0 && <div className="absolute inset-y-0 left-0 bg-blue-800 rounded-l" style={{ width: `${task.progress}%` }}></div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
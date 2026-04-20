import React, { useState, useMemo } from 'react';

interface Task {
  id: string;
  name: string;
  duration_days: number;
  dependencies: string[];
  start_date?: string;
  end_date?: string;
  is_critical?: boolean;
  float_days?: number;
}

const GanttChart: React.FC = () => {
  const [tasks] = useState<Task[]>([
    { id: '1', name: 'Site Preparation', duration_days: 5, dependencies: [] },
    { id: '2', name: 'Excavation', duration_days: 8, dependencies: ['1'] },
    { id: '3', name: 'Foundation Pour', duration_days: 4, dependencies: ['2'] },
    { id: '4', name: 'Drainage', duration_days: 6, dependencies: ['2'] },
    { id: '5', name: 'Retaining Wall', duration_days: 12, dependencies: ['3'] },
    { id: '6', name: 'Backfilling', duration_days: 3, dependencies: ['4','5'] },
  ]);

  const schedule = useMemo(() => {
    // Simple CPM calculation for demo
    const scheduled = [...tasks];
    let day = 0;
    
    scheduled.forEach(task => {
      if (task.dependencies.length === 0) {
        task.start_date = new Date(Date.now() + day * 86400000).toISOString().split('T')[0];
        day += task.duration_days;
        task.end_date = new Date(Date.now() + day * 86400000).toISOString().split('T')[0];
        task.is_critical = true;
      }
    });

    return scheduled;
  }, [tasks]);

  const totalDays = 35;
  const dayWidth = 18;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Project Timeline Scheduler</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-12 border-b">
            <div className="col-span-4 p-4 border-r font-semibold text-gray-700">Task</div>
            <div className="col-span-8 p-4 font-semibold text-gray-700">Timeline</div>
          </div>

          {schedule.map((task, idx) => (
            <div key={task.id} className="grid grid-cols-12 border-b last:border-b-0">
              <div className="col-span-4 p-3 border-r">
                <div className="font-medium text-gray-800">{task.name}</div>
                <div className="text-xs text-gray-500">{task.duration_days} days</div>
              </div>
              <div className="col-span-8 p-3 relative">
                <div className="relative h-8">
                  <div 
                    className={`absolute top-0 h-6 rounded flex items-center justify-center text-xs text-white font-medium shadow ${task.is_critical ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{
                      left: `${idx * 5 * dayWidth}px`,
                      width: `${task.duration_days * dayWidth}px`
                    }}
                  >
                    {task.duration_days}d
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="p-4 bg-gray-50 border-t">
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Critical Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Normal Task</span>
              </div>
              <div className="text-sm text-gray-600 ml-auto">
                Project Duration: <span className="font-semibold">{totalDays} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
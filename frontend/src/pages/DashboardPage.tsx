import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { DashboardCharts } from '../components/DashboardCharts';

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  ip_address: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [apiStats, setApiStats] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [activityData, projectData, statsData] = await Promise.all([
        api.getActivityFeed(10),
        api.getProjects(0, 1),
        api.getStats(),
      ]);
      setActivities(activityData);
      setProjectCount(projectData.total);
      setApiStats(statsData);
    } catch (err) {
      setError('Failed to load dashboard data. Using fallback data.');
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: 'Active Projects', value: String(projectCount || 0), change: '+3 this month' },
    { label: 'Total Estimates', value: '$4.2M', change: '+12% vs last quarter' },
    { label: 'Pending Approvals', value: '8', change: '2 due today' },
    { label: 'Team Members', value: '16', change: '5 online now' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, here's what's happening today</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/projects')}>Create New Project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              <div className="text-xs text-green-600 mt-1">{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded text-sm">{error}</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {activity.user_id ? activity.user_id.slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.action}</span>{' '}
                        <span className="text-gray-500">{activity.entity_type}</span>{' '}
                        {activity.entity_id && <span className="font-medium text-blue-600">{activity.entity_id.slice(0, 8)}</span>}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/estimator')}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              New Estimate
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/drawings')}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Drawing
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/reports')}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Generate Report
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/estimator')}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Budget
            </Button>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts
        costData={apiStats?.cost_breakdown}
        tradeBreakdown={apiStats?.trade_breakdown}
        projectProgress={apiStats?.project_progress}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { Employee, Schedule, Assignment, ShiftTemplate } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp
} from "lucide-react";

import StatsOverview from "../components/dashboard/StatsOverview";
import RecentSchedules from "../components/dashboard/RecentSchedules";
import QuickActions from "../components/dashboard/QuickActions";
import UpcomingShifts from "../components/dashboard/UpcomingShifts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeSchedules: 0,
    totalShiftTemplates: 0,
    weeklyHours: 0
  });
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Added error state

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors on retry
      
      // Load basic stats
      const [employees, schedules, templates, assignments] = await Promise.all([
        Employee.list(),
        Schedule.list('-created_date', 5),
        ShiftTemplate.list(),
        Assignment.list('-created_date', 10)
      ]);

      setStats({
        totalEmployees: employees.filter(e => e.active !== false).length,
        activeSchedules: schedules.filter(s => s.status !== 'locked').length,
        totalShiftTemplates: templates.filter(t => t.active !== false).length,
        weeklyHours: assignments.reduce((sum, a) => sum + (a.hours || 0), 0)
      });

      setRecentSchedules(schedules);
      setUpcomingShifts(assignments.slice(0, 5));
      
    } catch (err) { // Changed 'error' to 'err' to avoid conflict with state variable
      console.error("Error loading dashboard data:", err);
      setError("A network error occurred while loading dashboard data. Some information may be missing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && !isLoading && (
        <div className="premium-card p-8 text-center bg-red-500/10 mb-8 rounded-xl"> {/* Added rounded-xl for consistency */}
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-medium text-red-300 mb-2">Could Not Load All Data</h3>
          <p className="text-red-400/80 mb-6">{error}</p>
          <Button onClick={loadDashboardData} className="premium-button px-6 py-2"> {/* Changed to Button component */}
            Try Again
          </Button>
        </div>
      )}

      {/* Stats Overview */}
      <StatsOverview stats={stats} isLoading={isLoading} />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <RecentSchedules 
            schedules={recentSchedules} 
            isLoading={isLoading}
          />
          
          <UpcomingShifts 
            shifts={upcomingShifts}
            isLoading={isLoading}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          
          {/* System Status */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>System Status</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg flex items-center justify-between text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Scheduling Engine</span>
                <span className="text-green-600 font-medium">Online</span>
              </div>
              <div className="p-3 rounded-lg flex items-center justify-between text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Backup</span>
                <span className="text-green-600 font-medium">2 hours ago</span>
              </div>
              <div className="p-3 rounded-lg flex items-center justify-between text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Users</span>
                <span className="text-green-600 font-medium">3 online</span>
              </div>
            </div>
          </div>

          {/* Tips & Insights */}
          <div className="glass-card rounded-xl">
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="text-lg font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Scheduling Tips
              </h3>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">Optimize Fairness</p>
                <p className="text-blue-600 dark:text-blue-300">Review hour distribution weekly to maintain team morale</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-200 font-medium mb-1">Peak Hours Coverage</p>
                <p className="text-amber-600 dark:text-amber-300">Ensure adequate staffing during busy periods</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

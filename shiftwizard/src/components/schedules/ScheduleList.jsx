import { Calendar, Users, Clock, Eye, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  draft: {
    color: "bg-yellow-400 text-white",
    icon: Clock
  },
  published: {
    color: "bg-green-400 text-white", 
    icon: TrendingUp
  },
  locked: {
    color: "bg-gray-400 text-white",
    icon: Clock
  }
};

export default function ScheduleList({ schedules, isLoading, onSelectSchedule }) {
  if (isLoading) {
    return (
      <div className="neuro-card p-6">
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="neuro-card-inset p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="neuro-card p-8 text-center">
        <div className="neuro-icon w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No schedules created yet</h3>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Generate your first weekly schedule to get started</p>
      </div>
    );
  }

  return (
    <div className="neuro-card">
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Weekly Schedules ({schedules.length})</h3>
      </div>
      <div className="p-6 space-y-4">
        {schedules.map((schedule) => {
          const StatusIcon = statusConfig[schedule.status]?.icon || Clock;
          return (
            <div key={schedule.id} className="neuro-card-inset p-6 hover:shadow-inner transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="neuro-icon w-14 h-14 flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                      {schedule.name || `Week of ${format(new Date(schedule.start_date), "MMM d, yyyy")}`}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{schedule.total_hours || 0} total hours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{schedule.coverage_percentage || 0}% coverage</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Score: {schedule.fairness_score || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`neuro-badge px-4 py-2 flex items-center gap-2 ${statusConfig[schedule.status]?.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="font-medium capitalize">{schedule.status}</span>
                  </div>
                  <div 
                    className="neuro-button px-4 py-2 flex items-center gap-2 cursor-pointer"
                    onClick={() => onSelectSchedule(schedule)}
                  >
                    <Eye className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>View Details</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
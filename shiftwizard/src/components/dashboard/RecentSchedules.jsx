import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, CheckCircle, Clock, Lock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  draft: {
    color: "bg-gradient-to-r from-amber-400 to-orange-500",
    icon: Clock,
    text: "text-white"
  },
  published: {
    color: "bg-gradient-to-r from-green-400 to-emerald-500", 
    icon: CheckCircle,
    text: "text-white"
  },
  locked: {
    color: "bg-gradient-to-r from-gray-400 to-gray-500",
    icon: Lock,
    text: "text-white"
  }
};

export default function RecentSchedules({ schedules, isLoading }) {
  return (
    <div className="premium-card overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Recent Schedules
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Your latest scheduling activity
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-0 p-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-6 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-5 w-48 bg-white/10" />
                    <Skeleton className="h-4 w-32 bg-white/10" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-20 rounded-full bg-white/10" />
                    <Skeleton className="h-10 w-24 rounded-xl bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : schedules.length > 0 ? (
          <div className="divide-y divide-white/5">
            {schedules.map((schedule) => {
              const StatusIcon = statusConfig[schedule.status]?.icon || Clock;
              const statusStyle = statusConfig[schedule.status];
              return (
                <div key={schedule.id} className="p-6 hover:bg-white/5 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 rounded-2xl gradient-tertiary flex items-center justify-center shadow-lg">
                        <Calendar className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                          {schedule.name || `Week of ${format(new Date(schedule.start_date), "MMM d, yyyy")}`}
                        </h3>
                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.total_hours || 0}h scheduled
                          </span>
                          <span>•</span>
                          <span>{schedule.coverage_percentage || 0}% coverage</span>
                          <span>•</span>
                          <span>Score: {schedule.fairness_score || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`${statusStyle?.color} px-4 py-2 rounded-xl flex items-center gap-2 ${statusStyle?.text} shadow-lg`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="font-medium capitalize text-sm">{schedule.status}</span>
                      </div>
                      <Link to={createPageUrl("Schedules")}>
                        <button className="premium-button px-4 py-2 rounded-xl flex items-center gap-2 group-hover:transform group-hover:scale-105 transition-all">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>View</span>
                          <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>No schedules yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>Create your first schedule to get started with smart scheduling</p>
            <Link to={createPageUrl("Schedules")}>
              <button className="gradient-primary px-8 py-4 rounded-2xl text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                Create Your First Schedule
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({ title, value, icon: Icon, trend, isLoading, gradient }) => (
  <div className={`premium-card p-6 overflow-hidden relative ${gradient}`}>
    {isLoading ? (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24 bg-white/20" />
        <Skeleton className="h-8 w-16 bg-white/20" />
      </div>
    ) : (
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm font-medium text-white/80 mb-2">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-white">
              {value}
            </h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center text-sm bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full">
            <TrendingUp className="w-4 h-4 mr-2 text-white/90" />
            <span className="text-white/90 font-medium">{trend}</span>
          </div>
        )}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/10 -translate-x-4 translate-y-4"></div>
      </div>
    )}
  </div>
);

export default function StatsOverview({ stats, isLoading }) {
  const cardConfigs = [
    {
      title: "Active Employees",
      value: stats.totalEmployees,
      icon: Users,
      trend: "2 new this week",
      gradient: "gradient-primary"
    },
    {
      title: "Active Schedules", 
      value: stats.activeSchedules,
      icon: Calendar,
      trend: "1 published",
      gradient: "gradient-secondary"
    },
    {
      title: "Shift Templates",
      value: stats.totalShiftTemplates,
      icon: Clock,
      trend: "100% coverage",
      gradient: "gradient-tertiary"
    },
    {
      title: "Weekly Hours",
      value: Math.round(stats.weeklyHours),
      icon: TrendingUp,
      trend: "Within budget",
      gradient: "gradient-primary"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardConfigs.map((config, index) => (
        <StatCard
          key={config.title}
          {...config}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
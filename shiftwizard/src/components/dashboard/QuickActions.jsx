import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Clock, Calendar, Zap, ArrowRight, User } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "My Profile",
      description: "Update personal information",
      icon: User,
      link: createPageUrl("Profile"),
      gradient: "gradient-tertiary"
    },
    {
      title: "Add Employee",
      description: "Register new team member",
      icon: Users,
      link: createPageUrl("Employees"),
      gradient: "gradient-primary"
    },
    {
      title: "Create Template", 
      description: "Define shift patterns",
      icon: Clock,
      link: createPageUrl("ShiftTemplates"),
      gradient: "gradient-secondary"
    },
    {
      title: "Generate Schedule",
      description: "Auto-create weekly plan",
      icon: Calendar,
      link: createPageUrl("Schedules"),
      gradient: "gradient-tertiary"
    }
  ];

  return (
    <div className="premium-card overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-secondary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Fast access to key features</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {actions.map((action, index) => (
          <Link key={action.title} to={action.link}>
            <div className="premium-button p-5 rounded-2xl w-full transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl ${action.gradient} flex items-center justify-center shadow-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{action.title}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{action.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-white/5 to-transparent -translate-y-4 translate-x-4 group-hover:scale-150 transition-transform duration-500"></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
import { Switch } from "@/components/ui/switch";
import { Clock, Users, Zap, Edit, Trash2, Copy, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

const roleColors = {
  'Manager': 'bg-purple-500 text-white',
  'Cashier': 'bg-green-500 text-white',
  'Cook': 'bg-red-500 text-white',
  'Server': 'bg-indigo-500 text-white',
  'Bar': 'bg-pink-500 text-white',
  'Kitchen': 'bg-amber-500 text-white'
};

export default function TemplateGrid({ templates, isLoading, onEdit, onDelete, onDuplicate, onToggleActive, problematicTemplateIds }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 w-full">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="glass-card p-3 md:p-4 rounded-xl">
            <div className="space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getRecurrenceBadge = (recurrence) => {
    const colors = {
      'Weekly': 'bg-green-100 text-green-800',
      'Biweekly': 'bg-blue-100 text-blue-800', 
      'One-time': 'bg-gray-100 text-gray-800'
    };
    return colors[recurrence] || colors['Weekly'];
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 w-full">
        {templates.map((template) => {
          const isProblematic = problematicTemplateIds && problematicTemplateIds.has(template.id);
          return (
            <div key={template.id} className={`glass-card overflow-hidden flex flex-col w-full rounded-xl transition-all ${!template.active ? 'opacity-50' : ''} ${isProblematic ? 'border-2 border-red-400' : ''}`}>
              <div className="p-3 md:p-4 flex-grow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.active}
                        onCheckedChange={(isChecked) => onToggleActive(template, isChecked)}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <h4 className="font-bold text-sm md:text-lg leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                        {template.name}
                      </h4>
                    </div>
                    <p className="text-xs md:text-sm mt-1 ml-12" style={{ color: 'var(--text-secondary)' }}>
                      {template.day}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 md:gap-2 flex-shrink-0">
                    <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${roleColors[template.role] || 'bg-gray-500 text-white'} shadow-sm whitespace-nowrap`}>
                      {template.role}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRecurrenceBadge(template.recurrence)}`}>
                      {template.recurrence}
                    </div>
                    {isProblematic && (
                       <div className="px-2 py-1 flex items-center gap-1 text-xs bg-red-500 text-white rounded-full">
                         <AlertTriangle className="w-3 h-3"/>
                         Conflict
                       </div>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-1 md:gap-2 text-center mb-3">
                  {/* Time */}
                  <div className="p-2 md:p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <Clock className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {template.start_time}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {template.end_time}
                    </div>
                  </div>

                  {/* Staff */}
                  <div className="p-2 md:p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <Users className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {template.min_staff} - {template.max_staff}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      staff
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="p-2 md:p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <Zap className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-yellow-600 mx-auto mb-1" />
                    <div className="text-sm md:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {template.priority}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      priority
                    </div>
                  </div>
                </div>

                {/* Location */}
                {template.location && (
                  <div className="mt-2 md:mt-3 text-xs text-center truncate" style={{ color: 'var(--text-tertiary)' }}>
                    📍 {template.location}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-2 md:p-3 flex justify-end gap-1 md:gap-2" style={{ background: 'var(--bg-tertiary)' }}>
                <button className="modern-button p-1.5 md:p-2 rounded-lg flex-shrink-0" onClick={() => onDuplicate(template)}>
                  <Copy className="w-3 h-3 md:w-4 md:h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button className="modern-button p-1.5 md:p-2 rounded-lg flex-shrink-0" onClick={() => onEdit(template)}>
                  <Edit className="w-3 h-3 md:w-4 md:h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <button className="modern-button p-1.5 md:p-2 rounded-lg flex-shrink-0" onClick={() => onDelete(template.id)}>
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

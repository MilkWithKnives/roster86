import { Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const roleColors = {
  'FOH': 'border-l-4 border-blue-400',
  'BOH': 'border-l-4 border-orange-400',
  'Manager': 'border-l-4 border-purple-400',
  'Cashier': 'border-l-4 border-green-400',
  'Cook': 'border-l-4 border-red-400',
  'Server': 'border-l-4 border-indigo-400'
};

export default function WeekView({ templates, isLoading, onEdit }) {

  const getTemplatesForDay = (day) => {
    return templates
      .filter(t => t.day === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="neuro-card overflow-hidden">
      <div className="p-6 border-b border-gray-300">
        <h3 className="text-lg font-bold text-gray-700">Weekly Template Overview</h3>
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-200 min-w-[1000px] overflow-x-auto">
        {daysOfWeek.map(day => (
          <div key={day} className="flex flex-col">
            <div className="p-4 border-b border-gray-200 text-center bg-gray-100/50">
              <h4 className="font-semibold text-gray-700">{day}</h4>
            </div>
            <div className="p-4 space-y-4 flex-grow bg-white">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="neuro-card-inset p-3">
                    <Skeleton className="h-4 w-4/5 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3 mt-1" />
                  </div>
                ))
              ) : (
                getTemplatesForDay(day).map(template => (
                  <div 
                    key={template.id} 
                    className={`neuro-card-inset p-3 cursor-pointer hover:shadow-inner ${roleColors[template.role]}`}
                    onClick={() => onEdit(template)}
                  >
                    <p className="font-semibold text-sm text-gray-700 truncate">{template.name}</p>
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{template.start_time} - {template.end_time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{template.min_staff}-{template.max_staff} staff</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!isLoading && getTemplatesForDay(day).length === 0 && (
                <div className="text-center text-gray-400 text-sm h-full flex items-center justify-center">
                  No templates
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { Clock, User, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpcomingShifts({ shifts, isLoading }) {
  return (
    <div className="neuro-card">
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <div className="neuro-icon w-10 h-10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          Upcoming Shifts
        </h2>
      </div>
      <div className="p-0">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="neuro-card-inset p-4 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : shifts.length > 0 ? (
          <div className="p-6 space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="neuro-card-inset p-6 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="neuro-icon w-12 h-12 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{shift.day}</span>
                      <div className="neuro-badge px-3 py-1 text-xs text-white">
                        {shift.start_time} - {shift.end_time}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Employee #{shift.employee_id?.slice(0,8)}
                      </div>
                      {shift.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {shift.location}
                        </div>
                      )}
                      <span>{shift.hours} hours</span>
                    </div>
                  </div>
                  <div className={`neuro-badge px-3 py-1 text-xs ${
                    shift.status === 'scheduled' ? 'bg-blue-400 text-white' :
                    shift.status === 'confirmed' ? 'bg-green-400 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {shift.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="neuro-icon w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No upcoming shifts</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Shifts will appear here once schedules are created</p>
          </div>
        )}
      </div>
    </div>
  );
}
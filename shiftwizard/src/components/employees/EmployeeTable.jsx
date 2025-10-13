import { Edit, Trash2, Phone, Mail, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const roleColors = {
  'FOH': 'bg-blue-400 text-white',
  'BOH': 'bg-orange-400 text-white',
  'Manager': 'bg-purple-400 text-white',
  'Cashier': 'bg-green-400 text-white',
  'Cook': 'bg-red-400 text-white',
  'Server': 'bg-indigo-400 text-white'
};

export default function EmployeeTable({ employees, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="neuro-card p-6">
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="neuro-card-inset p-4 flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="neuro-card p-8 text-center">
        <div className="neuro-icon w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No employees found</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Add your first team member to get started</p>
      </div>
    );
  }

  return (
    <div className="neuro-card">
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Team Members ({employees.length})</h3>
      </div>
      <div className="p-6 space-y-4">
        {employees.map((employee) => (
          <div key={employee.id} className="neuro-card-inset p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="neuro-icon w-14 h-14 flex items-center justify-center text-lg font-bold text-white">
                  {(employee.full_name || employee.name || 'N').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{employee.full_name || employee.name}</h4>
                    <div className={`neuro-badge px-3 py-1 text-xs font-medium ${roleColors[employee.position || employee.role] || 'bg-gray-400 text-white'}`}>
                      {employee.position || employee.role}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {employee.phone || 'No phone'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {employee.email || 'No email'}
                    </div>
                    <div>
                      <span className="font-medium">Up to {employee.max_hours_per_week || employee.max_hours_week || 40}h/week</span>
                      {(employee.hourly_rate || employee.wage) && <span className="ml-2">${employee.hourly_rate || employee.wage}/hr</span>}
                    </div>
                  </div>
                  {employee.preferred_days && employee.preferred_days.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {employee.preferred_days.map((day) => (
                        <span key={day} className="neuro-badge px-2 py-1 text-xs bg-gray-400 text-white">
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <div 
                  className="neuro-button p-2 cursor-pointer"
                  onClick={() => onEdit(employee)}
                >
                  <Edit className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div 
                  className="neuro-button p-2 cursor-pointer hover:bg-red-50"
                  onClick={() => onDelete(employee.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

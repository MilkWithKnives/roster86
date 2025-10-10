import { Users, Clock, DollarSign, Award } from "lucide-react";

export default function EmployeeStats({ employees }) {
  const activeEmployees = employees.filter(e => e.active !== false);
  const totalMaxHours = activeEmployees.reduce((sum, emp) => sum + (emp.max_hours_week || 0), 0);
  const avgWage = activeEmployees.length > 0 
    ? activeEmployees.reduce((sum, emp) => sum + (emp.wage || 0), 0) / activeEmployees.length 
    : 0;
  const avgSeniority = activeEmployees.length > 0
    ? activeEmployees.reduce((sum, emp) => sum + (emp.seniority || 0), 0) / activeEmployees.length
    : 0;

  const stats = [
    {
      title: "Total Employees",
      value: activeEmployees.length,
      icon: Users,
      color: "bg-indigo-500"
    },
    {
      title: "Weekly Capacity",
      value: `${totalMaxHours}h`,
      icon: Clock,
      color: "bg-green-500"
    },
    {
      title: "Average Wage",
      value: `$${avgWage.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-purple-500"
    },
    {
      title: "Avg Seniority",
      value: avgSeniority.toFixed(1),
      icon: Award,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => (
        <div key={stat.title} className="neuro-card p-6">
          <div className="flex items-center gap-4">
            <div className="neuro-icon w-12 h-12 flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.title}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
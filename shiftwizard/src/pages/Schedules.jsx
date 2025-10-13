
import { useState, useEffect } from "react";
import { Schedule, Assignment, Employee, ShiftTemplate } from "@/api/entities";
import { Plus, AlertCircle } from "lucide-react";

import ScheduleGrid from "../components/schedules/ScheduleGrid";
import ScheduleGenerator from "../components/schedules/ScheduleGenerator";
import ScheduleList from "../components/schedules/ScheduleList";

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors on retry
      const [schedulesData, employeesData, templatesData] = await Promise.all([
        Schedule.list('-created_date'),
        Employee.list(),
        ShiftTemplate.list()
      ]);
      
      setSchedules(schedulesData);
      setEmployees(employeesData.filter(e => e.active !== false));
      setTemplates(templatesData.filter(t => t.active !== false));
    } catch (err) {
      console.error("Error loading data:", err);
      setError("A network error occurred while loading schedule data. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduleAssignments = async (scheduleId) => {
    try {
      const assignmentsData = await Assignment.filter({ schedule_id: scheduleId });
      setAssignments(assignmentsData);
      setError(null); // Clear any previous errors if assignment loading is successful
    } catch (err) {
      console.error("Error loading assignments:", err);
      setError("Failed to load assignments for the selected schedule.");
    }
  };

  const handleSelectSchedule = async (schedule) => {
    setCurrentSchedule(schedule);
    setViewMode("grid");
    await loadScheduleAssignments(schedule.id);
  };

  const handleGenerateSchedule = async (scheduleData) => {
    try {
      // Create new schedule
      const newSchedule = await Schedule.create({
        week_start_date: scheduleData.week_start_date,
        status: "draft",
        notes: scheduleData.notes || ""
      });

      let assignments = [];
      // Only generate assignments if the user checked the box
      if (scheduleData.auto_apply_templates) {
        // Here we would normally call a scheduling algorithm
        // For MVP, we'll create some basic assignments based on the selected strategy
        assignments = await generateBasicAssignments(
          newSchedule.id, 
          scheduleData.week_start_date,
          employees,
          templates,
          scheduleData.strategy // Pass strategy to generator
        );
      }

      // Calculate schedule metrics
      const totalHours = assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
      const coverage = calculateCoverage(assignments, templates);
      const fairness = calculateFairness(assignments);

      // Update schedule with metrics
      await Schedule.update(newSchedule.id, {
        total_hours: totalHours,
        coverage_percentage: coverage,
        fairness_score: fairness
      });

      setShowGenerator(false);
      loadData();
      setError(null); // Clear any errors after successful generation
    } catch (err) {
      console.error("Error generating schedule:", err);
      setError("Failed to generate schedule. Please check inputs and try again.");
    }
  };

  // Enhanced assignment generation with better logic
  const generateBasicAssignments = async (scheduleId, weekStart, employees, templates, strategy) => {
    const assignments = [];
    const startDate = new Date(weekStart);
    const weekNumber = getWeekNumber(startDate);
    
    // Filter templates based on recurrence - make this more inclusive
    const applicableTemplates = templates.filter(template => {
      if (template.recurrence === "Weekly") return true;
      if (template.recurrence === "Biweekly") {
        // Apply biweekly templates on odd weeks (can be adjusted as needed)
        // Note: weekNumber is 1-indexed. If it's the first week of the year, it's week 1.
        // weekNumber % 2 === 1 would mean odd-numbered weeks of the year.
        return weekNumber % 2 === 1;
      }
      if (template.recurrence === "One-time") return true; // Include one-time for manual assignment
      return false;
    });

    console.log(`Week ${weekNumber}: Found ${applicableTemplates.length} applicable templates out of ${templates.length} total`);

    // Simple strategy implementation
    let sortedEmployees = [...employees];
    if (strategy === 'cost_optimized') {
      sortedEmployees.sort((a, b) => (a.hourly_rate || a.wage || 15) - (b.hourly_rate || b.wage || 15)); // Default wage if not set
    } else if (strategy === 'favor_seniority') {
      sortedEmployees.sort((a, b) => (b.seniority || 1) - (a.seniority || 1)); // Default seniority
    }
    
    for (const template of applicableTemplates) {
      // More flexible employee filtering - prioritize by preference but don't exclude
      const availableEmployees = sortedEmployees.filter(emp => {
        // Must match role
        if ((emp.role || emp.position) !== template.role) return false;
        
        // Check availability - but be more flexible
        if (emp.preferred_days && emp.preferred_days.length > 0) {
          // If they have preferences, they get higher priority if day matches
          return emp.preferred_days.includes(template.day);
        }
        
        // If no preferred days set, they're available for any day
        return true;
      });
      
      // If no exact matches found (role + preference), try to find employees with the same role regardless of preference
      let fallbackEmployees = [];
      if (availableEmployees.length === 0) {
        fallbackEmployees = sortedEmployees.filter(emp => (emp.role || emp.position) === template.role);
        console.log(`No preferred employees for "${template.name}" (role: ${template.role}, day: ${template.day}), found ${fallbackEmployees.length} fallback employees`);
      }
      
      const employeesToUse = availableEmployees.length > 0 ? availableEmployees : fallbackEmployees;
      
      console.log(`Template "${template.name}": ${employeesToUse.length} available employees for role ${template.role} on ${template.day}`);
      
      // Assign minimum required staff (or maximum available if less than minimum)
      const staffToAssign = Math.min(template.min_staff, employeesToUse.length);
      
      for (let i = 0; i < staffToAssign; i++) {
        const employee = employeesToUse[i];
        const hours = calculateHours(template.start_time, template.end_time);

        // Calculate the actual date for this day of the week
        const startDate = new Date(weekStart);
        const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
        const targetDay = dayMap[template.day];
        const currentDay = startDate.getDay();
        const daysToAdd = (targetDay - currentDay + 7) % 7;
        const assignmentDate = new Date(startDate);
        assignmentDate.setDate(startDate.getDate() + daysToAdd);
        const dateString = assignmentDate.toISOString().split('T')[0];

        try {
          const assignment = await Assignment.create({
            schedule_id: scheduleId,
            employee_id: employee.id,
            shift_template_id: template.id,
            date: dateString,
            start_time: template.start_time,
            end_time: template.end_time,
            break_duration: template.break_duration || 0,
            status: "scheduled",
            notes: template.location ? `Location: ${template.location}` : ''
          });

          assignments.push(assignment);
          console.log(`✅ Created assignment: ${employee.full_name || employee.name} on ${dateString} ${template.start_time}-${template.end_time} (${hours}h)`);
        } catch (error) {
          console.error(`❌ Failed to create assignment for ${employee.full_name || employee.name} for template "${template.name}":`, error);
        }
      }
      
      // If we couldn't assign minimum staff, log a warning
      if (staffToAssign < template.min_staff) {
        console.warn(`⚠️ Template "${template.name}" requires ${template.min_staff} staff but only ${staffToAssign} could be assigned.`);
      }
    }
    
    console.log(`Generated ${assignments.length} total assignments for ${applicableTemplates.length} templates`);
    return assignments;
  };

  const getWeekNumber = (date) => {
    // Copy date object to avoid modifying original
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  };

  const calculateHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour + endMin/60) - (startHour + startMin/60);
  };

  const calculateCoverage = (assignments, templates) => {
    // Filter templates to only include those applicable for the current generation based on recurrence.
    // This is a simplified calculation and might need adjustment if templates are filtered differently
    // for assignment generation vs. coverage calculation. For now, assume all active templates contribute to required shifts.
    const requiredShifts = templates.reduce((sum, t) => sum + t.min_staff, 0);
    return requiredShifts > 0 ? Math.round((assignments.length / requiredShifts) * 100) : 0;
  };

  const calculateFairness = (assignments) => {
    const employeeHours = {};
    assignments.forEach(a => {
      employeeHours[a.employee_id] = (employeeHours[a.employee_id] || 0) + (a.hours || 0);
    });

    const hours = Object.values(employeeHours);
    if (hours.length === 0) return 100;

    const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;

    return Math.max(0, Math.round(100 - variance));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {currentSchedule ? `Interactive Schedule - Week of ${currentSchedule.start_date}` : 'Schedules'}
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {currentSchedule ? 'Drag and drop to manage shifts in real-time' : 'Manage weekly staff schedules'}
          </p>
        </div>
        <div className="flex gap-3">
          {currentSchedule && (
            <>
              <button
                className="premium-button px-4 py-2 rounded-xl"
                onClick={() => {
                  setCurrentSchedule(null);
                  setViewMode("list");
                  setError(null); // Clear error when navigating back to list
                }}
              >
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Back to List</span>
              </button>
            </>
          )}
          {!currentSchedule && (
            <button 
              onClick={() => {
                setShowGenerator(true);
                setError(null); // Clear error when opening generator
              }}
              className="gradient-primary px-6 py-3 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2 inline" />
              Generate Schedule
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && !isLoading && (
        <div className="premium-card p-8 text-center bg-red-500/10">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-medium text-red-300 mb-2">Could Not Load Data</h3>
          <p className="text-red-400/80 mb-6">{error}</p>
          <button onClick={loadData} className="premium-button px-6 py-2">
            Try Again
          </button>
        </div>
      )}

      {/* Main Content */}
      {!error && viewMode === "list" ? (
        <ScheduleList
          schedules={schedules}
          isLoading={isLoading}
          onSelectSchedule={handleSelectSchedule}
        />
      ) : !error && viewMode === "grid" ? (
        <ScheduleGrid
          schedule={currentSchedule}
          assignments={assignments}
          employees={employees}
          templates={templates}
          onUpdateAssignment={loadScheduleAssignments}
        />
      ) : null}

      {/* Schedule Generator Modal */}
      {showGenerator && (
        <ScheduleGenerator
          employees={employees}
          templates={templates}
          onGenerate={handleGenerateSchedule}
          onCancel={() => setShowGenerator(false)}
        />
      )}
    </div>
  );
}

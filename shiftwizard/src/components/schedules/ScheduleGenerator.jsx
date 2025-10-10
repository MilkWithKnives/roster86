
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, X, AlertTriangle } from "lucide-react";

export default function ScheduleGenerator({ employees, templates, onGenerate, onCancel }) {
  const [formData, setFormData] = useState({
    week_start_date: getNextMonday(),
    notes: "",
    strategy: "balanced",
    auto_apply_templates: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  function getNextMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getWeekNumber = (date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - start) / 86400000) + start.getDay() + 1) / 7);
  };


  const getBiweeklyWeekType = (weekNumber) => {
    return weekNumber % 2 === 1 ? "Odd Week" : "Even Week";
  };

  const getApplicableTemplatesBreakdown = () => {
    if (!formData.week_start_date) return { weekly: 0, biweekly: 0, oneTime: 0, weekType: "", autoApplicableThisWeek: 0 };
    
    const startDate = new Date(formData.week_start_date);
    const weekNumber = getWeekNumber(startDate);
    const weekType = getBiweeklyWeekType(weekNumber);
    
    const weeklyCount = templates.filter(t => t.recurrence === "Weekly").length;
    const biweeklyThisWeekCount = templates.filter(t => t.recurrence === "Biweekly" && (weekNumber % 2 === 1)).length;
    const oneTimeCount = templates.filter(t => t.recurrence === "One-time").length;

    return {
      weekly: weeklyCount,
      biweekly: biweeklyThisWeekCount,
      oneTime: oneTimeCount,
      weekType: weekType,
      autoApplicableThisWeek: weeklyCount + biweeklyThisWeekCount,
    };
  };

  React.useEffect(() => {
    if (formData.week_start_date) {
      const checkRecurrenceConflicts = (weekStartDate) => {
        const startDate = new Date(weekStartDate);
        const weekNumber = getWeekNumber(startDate);
        const conflictList = [];

        // Get applicable templates based on recurrence
        const applicableTemplates = templates.filter(template => {
          if (template.recurrence === "Weekly") return true;
          if (template.recurrence === "Biweekly") return weekNumber % 2 === 1;
          if (template.recurrence === "One-time") return false; // Manual assignment only, not for auto-conflict checks
          return false;
        });

        // Check for conflicts: same role + day + overlapping times
        const conflicts = {};
        applicableTemplates.forEach(template => {
          const key = `${template.role}-${template.day}`;
          if (!conflicts[key]) conflicts[key] = [];
          conflicts[key].push(template);
        });

        Object.entries(conflicts).forEach(([key, templateGroup]) => {
          if (templateGroup.length > 1) {
            // Check for time overlaps
            templateGroup.sort((a, b) => a.start_time.localeCompare(b.start_time));
            for (let i = 0; i < templateGroup.length - 1; i++) {
              const current = templateGroup[i];
              const next = templateGroup[i + 1];
              
              if (timeToMinutes(current.end_time) > timeToMinutes(next.start_time)) {
                conflictList.push({
                  type: 'overlap',
                  message: `${key.replace('-', ' on ')}: "${current.name}" overlaps with "${next.name}"`
                });
              }
            }
          }
        });

        return conflictList;
      };

      const newConflicts = checkRecurrenceConflicts(formData.week_start_date);
      setConflicts(newConflicts);
    }
  }, [formData.week_start_date, templates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onGenerate(formData);
    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-xl">
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Generate New Schedule</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Create optimized weekly assignments</p>
              </div>
            </div>
            <button className="modern-button p-2 rounded-lg" onClick={onCancel}>
              <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Week Selection and Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="week_start" style={{ color: 'var(--text-primary)' }}>
                Week Starting (Monday)
              </Label>
              <Input
                id="week_start"
                type="date"
                value={formData.week_start_date}
                onChange={(e) => handleInputChange('week_start_date', e.target.value)}
                className="modern-button"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="strategy" style={{ color: 'var(--text-primary)' }}>
                Generation Strategy
              </Label>
              <select
                id="strategy"
                value={formData.strategy}
                onChange={(e) => handleInputChange('strategy', e.target.value)}
                className="modern-button w-full p-2 rounded-lg"
              >
                <option value="balanced">Balanced (Fairness & Efficiency)</option>
                <option value="cost_optimized">Cost Optimized (Minimize labor costs)</option>
                <option value="favor_seniority">Favor Seniority (Prioritize experienced staff)</option>
              </select>
            </div>
          </div>

          {/* Enhanced Template Application Section */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="auto_apply"
                checked={formData.auto_apply_templates}
                onChange={(e) => handleInputChange('auto_apply_templates', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="auto_apply" style={{ color: 'var(--text-primary)' }}>
                Auto-apply recurring templates
              </Label>
            </div>
            
            {(() => {
              const breakdown = getApplicableTemplatesBreakdown();
              return (
                <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  <p className="mb-2">Templates available for this week:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Weekly:</span>
                      <span className="font-medium">{breakdown.weekly} templates</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biweekly ({breakdown.weekType}):</span>
                      <span className="font-medium">{breakdown.biweekly} templates</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Will auto-apply:</span>
                      <span>{breakdown.autoApplicableThisWeek} templates</span>
                    </div>
                  </div>
                  <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 Schedule will only be created if you have employees with matching roles and at least some availability
                    </p>
                  </div>
                </div>
              );
            })()}
            
            {conflicts.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-700">Template Conflicts Detected</span>
                </div>
                <ul className="text-sm text-red-600 space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>• {conflict.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Enhanced Schedule Summary */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Generation Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Available Employees:</span>
                <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>{employees.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Active Templates:</span>
                <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>{templates.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Expected Shifts:</span>
                <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {getApplicableTemplatesBreakdown().autoApplicableThisWeek} shifts
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Conflicts:</span>
                <span className={`ml-2 font-medium ${conflicts.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {conflicts.length}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" style={{ color: 'var(--text-primary)' }}>
              Schedule Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any special notes or requirements for this schedule..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="modern-button min-h-[100px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              type="button"
              className="modern-button flex-1 py-3 px-6 rounded-lg"
              onClick={onCancel}
            >
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isGenerating || conflicts.length > 0}
              className="gradient-primary flex-1 py-3 px-6 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Schedule</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

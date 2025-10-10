
import { useState, useEffect } from "react";
import { ShiftTemplate } from "@/api/entities";
import { Plus, AlertTriangle } from "lucide-react";
import { runCoverageCheck } from "../components/utils/coverageChecker";

import TemplateGrid from "../components/templates/TemplateGrid";
import TemplateForm from "../components/templates/TemplateForm";
import WeekView from "../components/templates/WeekView";
import CoverageCheckResults from "../components/templates/CoverageCheckResults";

export default function ShiftTemplates() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "calendar"
  const [coverageIssues, setCoverageIssues] = useState([]);
  const [problematicTemplates, setProblematicTemplates] = useState(new Set());
  const [showCoverageResults, setShowCoverageResults] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      // Run coverage check only on active templates
      const activeTemplates = templates.filter(t => t.active);
      const { results, problematicTemplateIds } = runCoverageCheck(activeTemplates);
      setCoverageIssues(results);
      setProblematicTemplates(problematicTemplateIds);
    }
  }, [templates]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await ShiftTemplate.list('-created_date');
      setTemplates(data); // Load all templates, active and inactive
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await ShiftTemplate.update(editingTemplate.id, templateData);
      } else {
        await ShiftTemplate.create(templateData);
      }
      
      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this shift template?")) {
      try {
        await ShiftTemplate.update(templateId, { active: false });
        loadTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const handleToggleActive = async (template, isActive) => {
    try {
      await ShiftTemplate.update(template.id, { ...template, active: isActive });
      loadTemplates();
    } catch (error) {
      console.error("Error updating template active status:", error);
    }
  };
  
  const handleDuplicateTemplate = async (template) => {
    // eslint-disable-next-line no-unused-vars
    const { id, created_date, updated_date, created_by, ...dupeData } = template;
    const duplicatedTemplate = {
      ...dupeData,
      name: `${template.name} (Copy)`,
    };

    setEditingTemplate(duplicatedTemplate);
    setShowForm(true);
  };

  const hasErrors = coverageIssues.some(issue => issue.type === 'error' || issue.type === 'warning');

  return (
    <div className="space-y-4 md:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Shift Templates</h1>
          <p className="text-sm md:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>Define recurring shift patterns for scheduling</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex border-2 rounded-lg overflow-hidden w-min" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              className={`px-3 md:px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "grid" ? 'gradient-primary text-white' : 'modern-button'
              }`}
              onClick={() => setViewMode("grid")}
            >
              Grid View
            </button>
            <button
              className={`px-3 md:px-4 py-2 text-sm font-medium transition-all ${
                viewMode === "calendar" ? 'gradient-primary text-white' : 'modern-button'
              }`}
              onClick={() => setViewMode("calendar")}
            >
              Week View
            </button>
          </div>

          <div className="flex gap-2 md:gap-3 items-center w-full sm:w-auto">
            <button 
              className={`modern-button px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 flex-1 sm:flex-none ${hasErrors ? 'border-red-300' : ''}`}
              onClick={() => setShowCoverageResults(true)}
            >
              {hasErrors && <AlertTriangle className="w-4 h-4 text-red-500" />}
              <span className="font-medium text-sm md:text-base" style={{ color: 'var(--text-primary)' }}>Check Coverage</span>
            </button>
            <button
              className="gradient-primary px-3 md:px-6 py-2 md:py-3 text-white rounded-lg flex-1 sm:flex-none"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-1 md:mr-2 inline" />
              <span className="font-medium text-sm md:text-base">Create Template</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      {viewMode === "grid" ? (
        <TemplateGrid
          templates={templates}
          isLoading={isLoading}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onDuplicate={handleDuplicateTemplate}
          onToggleActive={handleToggleActive}
          problematicTemplateIds={problematicTemplates}
        />
      ) : (
        <WeekView
          templates={templates.filter(t => t.active)} // Week view should only show active templates
          isLoading={isLoading}
          onEdit={handleEditTemplate}
        />
      )}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Coverage Results Modal */}
      {showCoverageResults && (
        <CoverageCheckResults 
          issues={coverageIssues} 
          onClose={() => setShowCoverageResults(false)}
        />
      )}
    </div>
  );
}

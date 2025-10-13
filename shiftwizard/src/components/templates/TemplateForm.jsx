
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Clock, Save } from "lucide-react";

const roles = ["Manager", "Cashier", "Cook", "Server", "Bar", "Kitchen"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const recurrenceOptions = ["Weekly", "Biweekly", "One-time"];

export default function TemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState(template || {
    name: "",
    role: "Server",
    day: "Monday",
    start_time: "09:00",
    end_time: "17:00",
    location: "",
    min_staff: 1,
    max_staff: 2,
    priority: 5,
    recurrence: "Weekly",
    active: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Template name must be at least 2 characters';
    }
    
    // Time validation
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      if (start >= end) {
        newErrors.end_time = 'End time must be after start time';
      }
    }
    
    // Staff validation
    if (formData.min_staff < 1) {
      newErrors.min_staff = 'Minimum staff must be at least 1';
    }
    
    if (formData.max_staff && formData.min_staff && formData.max_staff < formData.min_staff) {
      newErrors.max_staff = 'Maximum staff must be greater than or equal to minimum staff';
    }
    
    // Priority validation
    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.priority = 'Priority must be between 1 and 10';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving template:", error);
      
      // Handle backend validation errors
      if (error.response?.data?.details) {
        const backendErrors = {};
        error.response.data.details.forEach(detail => {
          if (detail.field) {
            backendErrors[detail.field] = detail.message;
          }
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'An error occurred while saving' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl">
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {template ? 'Edit Shift Template' : 'Create Shift Template'}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Define a reusable shift pattern</p>
              </div>
            </div>
            <button className="modern-button p-2 rounded-lg" onClick={onCancel}>
              <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General error display */}
          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}
          
          <div className="space-y-3">
            <Label htmlFor="name" style={{ color: 'var(--text-primary)' }}>Template Name *</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={(e) => handleInputChange('name', e.target.value)} 
              required 
              className="modern-button"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="role" style={{ color: 'var(--text-primary)' }}>Role *</Label>
              <select 
                id="role" 
                value={formData.role} 
                onChange={(e) => handleInputChange('role', e.target.value)} 
                required 
                className="modern-button w-full p-2 rounded-lg"
              >
                {roles.map(role => (<option key={role} value={role}>{role}</option>))}
              </select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="day" style={{ color: 'var(--text-primary)' }}>Day of Week *</Label>
              <select 
                id="day" 
                value={formData.day} 
                onChange={(e) => handleInputChange('day', e.target.value)} 
                required 
                className="modern-button w-full p-2 rounded-lg"
              >
                {daysOfWeek.map(day => (<option key={day} value={day}>{day}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label htmlFor="start_time" style={{ color: 'var(--text-primary)' }}>Start Time *</Label>
              <Input 
                id="start_time" 
                type="time" 
                value={formData.start_time} 
                onChange={(e) => handleInputChange('start_time', e.target.value)} 
                required 
                className="modern-button"
              />
              {errors.start_time && (
                <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="end_time" style={{ color: 'var(--text-primary)' }}>End Time *</Label>
              <Input 
                id="end_time" 
                type="time" 
                value={formData.end_time} 
                onChange={(e) => handleInputChange('end_time', e.target.value)} 
                required 
                className="modern-button"
              />
              {errors.end_time && (
                <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="recurrence" style={{ color: 'var(--text-primary)' }}>Recurrence</Label>
              <select 
                id="recurrence" 
                value={formData.recurrence} 
                onChange={(e) => handleInputChange('recurrence', e.target.value)} 
                className="modern-button w-full p-2 rounded-lg"
              >
                {recurrenceOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label htmlFor="min_staff" style={{ color: 'var(--text-primary)' }}>Min Staff</Label>
              <Input 
                id="min_staff" 
                type="number" 
                min="1" 
                value={formData.min_staff} 
                onChange={(e) => handleInputChange('min_staff', parseInt(e.target.value))} 
                className="modern-button"
              />
              {errors.min_staff && (
                <p className="text-red-500 text-sm mt-1">{errors.min_staff}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="max_staff" style={{ color: 'var(--text-primary)' }}>Max Staff</Label>
              <Input 
                id="max_staff" 
                type="number" 
                min="1" 
                value={formData.max_staff} 
                onChange={(e) => handleInputChange('max_staff', parseInt(e.target.value))} 
                className="modern-button"
              />
              {errors.max_staff && (
                <p className="text-red-500 text-sm mt-1">{errors.max_staff}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="priority" style={{ color: 'var(--text-primary)' }}>Priority (1-10)</Label>
              <Input 
                id="priority" 
                type="number" 
                min="1" 
                max="10" 
                value={formData.priority} 
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value))} 
                className="modern-button"
              />
              {errors.priority && (
                <p className="text-red-500 text-sm mt-1">{errors.priority}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="location" style={{ color: 'var(--text-primary)' }}>Location</Label>
            <Input 
              id="location" 
              value={formData.location} 
              onChange={(e) => handleInputChange('location', e.target.value)} 
              className="modern-button"
            />
          </div>

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
              disabled={isSaving} 
              className="gradient-primary flex-1 py-3 px-6 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>{template ? 'Update Template' : 'Create Template'}</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, User, Save } from "lucide-react";

const positions = ["Manager", "Cashier", "Cook", "Server", "Bar", "Kitchen"];
const departments = ["Operations", "Customer Service", "Kitchen", "Management"];
const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function EmployeeForm({ employee, onSave, onCancel }) {
  const [formData, setFormData] = useState(employee || {
    employee_id: "",
    full_name: "",
    email: "",
    phone: "",
    department: "Operations",
    position: "Server",
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: "",  // Start empty to avoid NaN issues
    max_hours_per_week: 40,
    availability: null,
    skills: null,
    status: "active"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }
    
    if (!formData.employee_id || formData.employee_id.trim().length === 0) {
      newErrors.employee_id = 'Employee ID is required';
    }
    
    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (if provided)
    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Hourly rate validation (if provided)
    if (formData.hourly_rate && (isNaN(formData.hourly_rate) || parseFloat(formData.hourly_rate) < 0)) {
      newErrors.hourly_rate = 'Hourly rate must be a positive number';
    }
    
    // Max hours validation
    if (formData.max_hours_per_week && (isNaN(formData.max_hours_per_week) || formData.max_hours_per_week < 1 || formData.max_hours_per_week > 168)) {
      newErrors.max_hours_per_week = 'Max hours per week must be between 1 and 168';
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
      // Clean up data - remove null/empty values that would fail validation
      const cleanData = { ...formData };
      if (cleanData.availability === null) {
        delete cleanData.availability;
      }
      if (cleanData.skills === null) {
        delete cleanData.skills;
      }
      // Handle empty numeric fields
      if (cleanData.hourly_rate === '' || isNaN(cleanData.hourly_rate)) {
        delete cleanData.hourly_rate;
      }
      if (cleanData.max_hours_per_week === '' || isNaN(cleanData.max_hours_per_week)) {
        cleanData.max_hours_per_week = 40; // Set default
      }
      // Remove empty strings from optional fields
      if (cleanData.email === '') delete cleanData.email;
      if (cleanData.phone === '') delete cleanData.phone;

      await onSave(cleanData);
    } catch (error) {
      console.error("Error saving employee:", error);
      
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvailabilityToggle = (day) => {
    const availability = formData.availability || {};
    const dayAvailability = availability[day] || { available: false };

    setFormData(prev => ({
      ...prev,
      availability: {
        ...(prev.availability || {}),
        [day]: {
          ...dayAvailability,
          available: !dayAvailability.available,
          start: dayAvailability.start || "09:00",
          end: dayAvailability.end || "17:00"
        }
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="neuro-icon w-10 h-10 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-700">
                  {employee ? 'Edit Employee' : 'Add New Employee'}
                </h2>
                <p className="text-sm text-gray-500">
                  {employee ? 'Update employee information' : 'Add a new team member'}
                </p>
              </div>
            </div>
            <div className="neuro-button p-2 cursor-pointer" onClick={onCancel}>
              <X className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          {/* General error display */}
          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name *
              </Label>
              <div className="neuro-input">
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                  required
                />
              </div>
              {errors.full_name && (
                <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="employee_id" className="text-sm font-medium text-gray-700">
                Employee ID *
              </Label>
              <div className="neuro-input">
                <Input
                  id="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                  placeholder="e.g., EMP001"
                  required
                />
              </div>
              {errors.employee_id && (
                <p className="text-red-500 text-sm mt-1">{errors.employee_id}</p>
              )}
            </div>
          </div>

          {/* Position and Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="position" className="text-sm font-medium text-gray-700">
                Position *
              </Label>
              <div className="neuro-input">
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0"
                  required
                >
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                Department
              </Label>
              <div className="neuro-input">
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <div className="neuro-input">
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="neuro-input">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Hours & Wage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label htmlFor="hire_date" className="text-sm font-medium text-gray-700">
                Hire Date
              </Label>
              <div className="neuro-input">
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="max_hours_per_week" className="text-sm font-medium text-gray-700">
                Max Hours/Week
              </Label>
              <div className="neuro-input">
                <Input
                  id="max_hours_per_week"
                  type="number"
                  min="0"
                  max="168"
                  value={formData.max_hours_per_week}
                  onChange={(e) => handleInputChange('max_hours_per_week', e.target.value ? parseInt(e.target.value) : '')}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
              {errors.max_hours_per_week && (
                <p className="text-red-500 text-sm mt-1">{errors.max_hours_per_week}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="hourly_rate" className="text-sm font-medium text-gray-700">
                Hourly Rate ($)
              </Label>
              <div className="neuro-input">
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : '')}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
              {errors.hourly_rate && (
                <p className="text-red-500 text-sm mt-1">{errors.hourly_rate}</p>
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Availability
            </Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => {
                const isAvailable = formData.availability?.[day]?.available;
                return (
                  <div
                    key={day}
                    className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      isAvailable
                        ? 'neuro-badge bg-indigo-400 text-white'
                        : 'neuro-button text-gray-600'
                    }`}
                    onClick={() => handleAvailabilityToggle(day)}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-300">
            <div 
              className="neuro-button flex-1 py-3 px-6 text-center cursor-pointer"
              onClick={onCancel}
            >
              <span className="font-medium text-gray-600">Cancel</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="neuro-button flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>{employee ? 'Update' : 'Create'} Employee</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

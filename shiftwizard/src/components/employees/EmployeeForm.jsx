
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    hourly_rate: 15.00,
    max_hours_per_week: 40,
    availability: null,
    skills: null,
    status: "active"
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving employee:", error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neuro-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => handleInputChange('max_hours_per_week', parseInt(e.target.value))}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
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
                  onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value))}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
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

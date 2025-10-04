
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Save } from "lucide-react";

const roles = ["Manager", "Cashier", "Cook", "Server", "Bar", "Kitchen"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function EmployeeForm({ employee, onSave, onCancel }) {
  const [formData, setFormData] = useState(employee || {
    name: "",
    role: "Server", // Changed default role from "FOH" to "Server"
    max_hours_week: 40,
    min_hours_week: 20,
    preferred_days: [],
    unavailable_times: [],
    seniority: 1,
    wage: 15.00,
    phone: "",
    email: "",
    active: true
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

  const handlePreferredDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      preferred_days: prev.preferred_days?.includes(day)
        ? prev.preferred_days.filter(d => d !== day)
        : [...(prev.preferred_days || []), day]
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
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name *
              </Label>
              <div className="neuro-input">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="border-0 bg-transparent focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                Role *
              </Label>
              <div className="neuro-input">
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0"
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
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
              <Label htmlFor="min_hours" className="text-sm font-medium text-gray-700">
                Min Hours/Week
              </Label>
              <div className="neuro-input">
                <Input
                  id="min_hours"
                  type="number"
                  min="0"
                  max="168"
                  value={formData.min_hours_week}
                  onChange={(e) => handleInputChange('min_hours_week', parseInt(e.target.value))}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="max_hours" className="text-sm font-medium text-gray-700">
                Max Hours/Week
              </Label>
              <div className="neuro-input">
                <Input
                  id="max_hours"
                  type="number"
                  min="0"
                  max="168"
                  value={formData.max_hours_week}
                  onChange={(e) => handleInputChange('max_hours_week', parseInt(e.target.value))}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="wage" className="text-sm font-medium text-gray-700">
                Hourly Wage ($)
              </Label>
              <div className="neuro-input">
                <Input
                  id="wage"
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.wage}
                  onChange={(e) => handleInputChange('wage', parseFloat(e.target.value))}
                  className="border-0 bg-transparent focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Seniority */}
          <div className="space-y-3">
            <Label htmlFor="seniority" className="text-sm font-medium text-gray-700">
              Seniority Level (1-10)
            </Label>
            <div className="neuro-input">
              <Input
                id="seniority"
                type="number"
                min="1"
                max="10"
                value={formData.seniority}
                onChange={(e) => handleInputChange('seniority', parseInt(e.target.value))}
                className="border-0 bg-transparent focus:ring-0"
              />
            </div>
          </div>

          {/* Preferred Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Preferred Working Days
            </Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <div
                  key={day}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.preferred_days?.includes(day)
                      ? 'neuro-badge bg-indigo-400 text-white'
                      : 'neuro-button text-gray-600'
                  }`}
                  onClick={() => handlePreferredDayToggle(day)}
                >
                  {day}
                </div>
              ))}
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

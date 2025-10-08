
import React, { useState, useEffect } from "react";
import { Employee } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";

import EmployeeTable from "../components/employees/EmployeeTable";
import EmployeeForm from "../components/employees/EmployeeForm";
import EmployeeStats from "../components/employees/EmployeeStats";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    // Move filtering logic directly into useEffect to avoid dependency issues
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        (emp.full_name || emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(emp => (emp.position || emp.role) === roleFilter);
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, roleFilter]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await Employee.list('-created_date');
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (editingEmployee) {
        await Employee.update(editingEmployee.id, employeeData);
      } else {
        await Employee.create(employeeData);
      }

      setShowForm(false);
      setEditingEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await Employee.update(employeeId, { status: 'inactive' });
        loadEmployees();
      } catch (error) {
        console.error("Error deactivating employee:", error);
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Team Management</h1>
          <p className="text-sm md:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>Manage employee information and availability</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="gradient-primary px-4 md:px-6 py-2 md:py-3 text-white rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 mr-1 md:mr-2" />
          <span className="font-medium text-sm md:text-base">Add Employee</span>
        </button>
      </div>

      {/* Stats */}
      <EmployeeStats employees={employees.filter(e => (e.status || e.active) === 'active' || (e.status || e.active) === true)} />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-transparent">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)'}} />
          <Input
            placeholder="Search employees by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-button pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="modern-button"
        >
          <option value="all">All Roles</option>
          <option value="Manager">Manager</option>
          <option value="Cashier">Cashier</option>
          <option value="Cook">Cook</option>
          <option value="Server">Server</option>
          <option value="Bar">Bar</option>
          <option value="Kitchen">Kitchen</option>
        </select>
      </div>

      {/* Employee Table */}
      <EmployeeTable
        employees={filteredEmployees}
        isLoading={isLoading}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
      />

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

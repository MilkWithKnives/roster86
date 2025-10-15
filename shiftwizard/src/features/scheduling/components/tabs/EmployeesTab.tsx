import React, { useState } from 'react';
import { Plus, Trash2, Edit, Clock, Users, Calendar, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchedulingStore } from '../../store/useSchedulingStore';

interface Employee {
  id: string;
  name: string;
  email: string;
  roles: string[];
  hourlyRate: number;
  maxHoursPerWeek: number;
  minHoursPerWeek: number;
  availability: {
    [day: string]: {
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[];
  };
  preferences: {
    preferredShifts: string[];
    avoidShifts: string[];
    maxConsecutiveDays: number;
    minRestBetweenShifts: number;
  };
}

export function EmployeesTab() {
  const { config, employees, addEmployee, updateEmployee, removeEmployee } = useSchedulingStore();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    email: '',
    roles: [],
    hourlyRate: 15,
    maxHoursPerWeek: 40,
    minHoursPerWeek: 0,
    availability: {},
    preferences: {
      preferredShifts: [],
      avoidShifts: [],
      maxConsecutiveDays: 5,
      minRestBetweenShifts: 12
    }
  });

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.email) {
      addEmployee(newEmployee as Employee);
      setNewEmployee({
        name: '',
        email: '',
        roles: [],
        hourlyRate: 15,
        maxHoursPerWeek: 40,
        minHoursPerWeek: 0,
        availability: {},
        preferences: {
          preferredShifts: [],
          avoidShifts: [],
          maxConsecutiveDays: 5,
          minRestBetweenShifts: 12
        }
      });
      setIsAddingEmployee(false);
    }
  };

  const AvailabilityGrid = ({ employeeId }: { employeeId: string }) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeSlots = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-8 gap-2">
          <div></div>
          {days.map(day => (
            <div key={day} className="text-center text-sm font-medium capitalize">
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {timeSlots.map(time => (
          <div key={time} className="grid grid-cols-8 gap-2">
            <div className="text-sm text-gray-600 self-center">{time}</div>
            {days.map(day => {
              const dayAvailability = employee.availability[day] || [];
              const isAvailable = dayAvailability.some(slot => 
                slot.startTime <= time && slot.endTime > time && slot.isAvailable
              );

              return (
                <button
                  key={`${day}-${time}`}
                  className={`w-8 h-8 rounded border-2 ${
                    isAvailable 
                      ? 'bg-green-500 border-green-600' 
                      : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Employee Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employee Management
          </CardTitle>
          <CardDescription>
            Manage employee information, roles, and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add New Employee */}
          {isAddingEmployee ? (
            <div className="space-y-4 p-4 border rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeName">Name</Label>
                  <Input
                    id="employeeName"
                    value={newEmployee.name || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Employee name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeEmail">Email</Label>
                  <Input
                    id="employeeEmail"
                    type="email"
                    value={newEmployee.email || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="employee@company.com"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newEmployee.hourlyRate || 0}
                    onChange={(e) => setNewEmployee({ ...newEmployee, hourlyRate: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxHours">Max Hours/Week</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    min="0"
                    value={newEmployee.maxHoursPerWeek || 0}
                    onChange={(e) => setNewEmployee({ ...newEmployee, maxHoursPerWeek: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minHours">Min Hours/Week</Label>
                  <Input
                    id="minHours"
                    type="number"
                    min="0"
                    value={newEmployee.minHoursPerWeek || 0}
                    onChange={(e) => setNewEmployee({ ...newEmployee, minHoursPerWeek: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        const roles = newEmployee.roles || [];
                        const isSelected = roles.includes(role.id);
                        setNewEmployee({
                          ...newEmployee,
                          roles: isSelected 
                            ? roles.filter(r => r !== role.id)
                            : [...roles, role.id]
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        (newEmployee.roles || []).includes(role.id)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddEmployee}>
                  Add Employee
                </Button>
                <Button variant="outline" onClick={() => setIsAddingEmployee(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAddingEmployee(true)} className="mb-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          )}

          {/* Employees List */}
          <div className="space-y-4">
            {employees.map(employee => (
              <Card
                key={employee.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedEmployee === employee.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedEmployee(employee.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold">{employee.name}</h4>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            ${employee.hourlyRate}/hr
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {employee.maxHoursPerWeek}h max
                          </Badge>
                          {employee.roles.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {employee.roles.length} roles
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee.id);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmployee(employee.id);
                          if (selectedEmployee === employee.id) {
                            setSelectedEmployee(null);
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {employees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No employees added</p>
              <p className="text-sm">Add your first employee to start building schedules</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Details */}
      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Employee Details - {employees.find(e => e.id === selectedEmployee)?.name}
            </CardTitle>
            <CardDescription>
              Manage availability and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="availability" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="availability">Availability</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="schedule">Schedule Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="availability" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="w-4 h-4" />
                    Click time slots to toggle availability. Green = Available, Gray = Unavailable
                  </div>
                  <AvailabilityGrid employeeId={selectedEmployee} />
                </div>
              </TabsContent>
              
              <TabsContent value="preferences" className="mt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxConsecutive">Max Consecutive Days</Label>
                      <Input
                        id="maxConsecutive"
                        type="number"
                        min="1"
                        max="7"
                        value={employees.find(e => e.id === selectedEmployee)?.preferences.maxConsecutiveDays || 5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="minRest">Min Rest Between Shifts (hours)</Label>
                      <Input
                        id="minRest"
                        type="number"
                        min="8"
                        max="24"
                        value={employees.find(e => e.id === selectedEmployee)?.preferences.minRestBetweenShifts || 12}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Preferred Shifts</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Morning', 'Afternoon', 'Evening', 'Night'].map(shift => (
                        <button
                          key={shift}
                          className="px-3 py-1 rounded-full text-sm border bg-gray-100 border-gray-300 text-gray-700"
                        >
                          {shift}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="schedule" className="mt-6">
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Schedule Preview</p>
                  <p className="text-sm">This will show how the employee fits into your schedules</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, Trash2, Copy, Settings, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchedulingStore } from '../../store/useSchedulingStore';

interface CoverageInterval {
  id: string;
  startTime: string;
  endTime: string;
  minEmployees: number;
  idealEmployees: number;
  maxEmployees: number;
}

interface Role {
  id: string;
  name: string;
  color: string;
  coverageIntervals: CoverageInterval[];
}

export function RolesCoverageTab() {
  const { config, addRole, updateRole, removeRole, addCoverageInterval, updateCoverageInterval, removeCoverageInterval } = useSchedulingStore();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3B82F6');

  const handleAddRole = () => {
    if (newRoleName.trim()) {
      addRole({
        name: newRoleName.trim(),
        color: newRoleColor,
        coverageIntervals: []
      });
      setNewRoleName('');
      setNewRoleColor('#3B82F6');
    }
  };

  const handleAddCoverageInterval = (roleId: string) => {
    addCoverageInterval(roleId, {
      startTime: '09:00',
      endTime: '17:00',
      minEmployees: 1,
      idealEmployees: 2,
      maxEmployees: 3
    });
  };

  const handleDuplicateDay = (roleId: string, day: string) => {
    const role = config.roles.find(r => r.id === roleId);
    if (!role) return;

    const dayCoverage = role.coverageIntervals.filter(ci => ci.day === day);
    dayCoverage.forEach(interval => {
      addCoverageInterval(roleId, {
        ...interval,
        id: `${interval.id}_copy_${Date.now()}`,
        day: day === 'monday' ? 'tuesday' : 
             day === 'tuesday' ? 'wednesday' :
             day === 'wednesday' ? 'thursday' :
             day === 'thursday' ? 'friday' :
             day === 'friday' ? 'saturday' : 'sunday'
      });
    });
  };

  const CoverageTimeline = ({ roleId }: { roleId: string }) => {
    const role = config.roles.find(r => r.id === roleId);
    if (!role) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
      <div className="space-y-6">
        {days.map(day => {
          const dayCoverage = role.coverageIntervals.filter(ci => ci.day === day);
          
          return (
            <Card key={day} className="border-l-4" style={{ borderLeftColor: role.color }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold capitalize">{day}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {dayCoverage.length} intervals
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateDay(roleId, day)}
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddCoverageInterval(roleId)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dayCoverage.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No coverage defined for {day}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCoverageInterval(roleId)}
                      className="mt-2"
                    >
                      Add coverage interval
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayCoverage.map(interval => (
                      <CoverageIntervalEditor
                        key={interval.id}
                        interval={interval}
                        roleId={roleId}
                        onUpdate={(updatedInterval) => updateCoverageInterval(roleId, interval.id, updatedInterval)}
                        onRemove={() => removeCoverageInterval(roleId, interval.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Roles Management
          </CardTitle>
          <CardDescription>
            Define roles and their coverage requirements for each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add New Role */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Server, Bartender, Host"
                className="mt-1"
              />
            </div>
            <div className="w-24">
              <Label htmlFor="roleColor">Color</Label>
              <Input
                id="roleColor"
                type="color"
                value={newRoleColor}
                onChange={(e) => setNewRoleColor(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddRole} disabled={!newRoleName.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>
          </div>

          {/* Roles List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.roles.map(role => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedRole === role.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <h4 className="font-semibold">{role.name}</h4>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{role.coverageIntervals.length} intervals</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRole(role.id);
                        if (selectedRole === role.id) {
                          setSelectedRole(null);
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {config.roles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No roles defined</p>
              <p className="text-sm">Add your first role to start defining coverage requirements</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coverage Timeline Editor */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Coverage Timeline - {config.roles.find(r => r.id === selectedRole)?.name}
            </CardTitle>
            <CardDescription>
              Define when and how many employees you need for each day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CoverageTimeline roleId={selectedRole} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Coverage Interval Editor Component
function CoverageIntervalEditor({ 
  interval, 
  roleId, 
  onUpdate, 
  onRemove 
}: { 
  interval: CoverageInterval; 
  roleId: string; 
  onUpdate: (interval: CoverageInterval) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (field: keyof CoverageInterval, value: any) => {
    onUpdate({
      ...interval,
      [field]: value
    });
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{interval.startTime} - {interval.endTime}</span>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Min: {interval.minEmployees}</span>
              <span>•</span>
              <span>Ideal: {interval.idealEmployees}</span>
              <span>•</span>
              <span>Max: {interval.maxEmployees}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <Label className="text-xs">Start Time</Label>
          <Input
            type="time"
            value={interval.startTime}
            onChange={(e) => handleUpdate('startTime', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">End Time</Label>
          <Input
            type="time"
            value={interval.endTime}
            onChange={(e) => handleUpdate('endTime', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Min Employees</Label>
          <Input
            type="number"
            min="0"
            value={interval.minEmployees}
            onChange={(e) => handleUpdate('minEmployees', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Ideal Employees</Label>
          <Input
            type="number"
            min="0"
            value={interval.idealEmployees}
            onChange={(e) => handleUpdate('idealEmployees', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="w-24">
          <Label className="text-xs">Max Employees</Label>
          <Input
            type="number"
            min="0"
            value={interval.maxEmployees}
            onChange={(e) => handleUpdate('maxEmployees', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIsEditing(false)}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

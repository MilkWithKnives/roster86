import React, { useState } from 'react';
import { Settings, AlertTriangle, Clock, Users, DollarSign, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchedulingStore } from '../../store/useSchedulingStore';

export function RulesTab() {
  const { config, setHardRules, setSoftRules } = useSchedulingStore();
  const [activeTab, setActiveTab] = useState('hard');

  const handleHardRuleChange = (rule: string, value: any) => {
    setHardRules({
      ...config.hardRules,
      [rule]: value
    });
  };

  const handleSoftRuleChange = (rule: string, value: number) => {
    setSoftRules({
      ...config.softRules,
      [rule]: value
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scheduling Rules & Constraints
          </CardTitle>
          <CardDescription>
            Define the rules that govern how schedules are generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hard" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Hard Rules
              </TabsTrigger>
              <TabsTrigger value="soft" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Soft Rules
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hard" className="mt-6">
              <div className="space-y-6">
                <div className="text-sm text-gray-600 mb-4">
                  Hard rules are non-negotiable constraints that must be followed. Violations will prevent schedule generation.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5" />
                        Work Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="maxHoursPerWeek">Max Hours Per Week</Label>
                          <p className="text-sm text-gray-600">Weekly hour limits</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="maxHoursPerWeek"
                            checked={config.hardRules?.maxHoursPerWeek?.enabled || false}
                            onCheckedChange={(checked) => handleHardRuleChange('maxHoursPerWeek', {
                              enabled: checked,
                              value: config.hardRules?.maxHoursPerWeek?.value || 40
                            })}
                          />
                          {config.hardRules?.maxHoursPerWeek?.enabled && (
                            <Input
                              type="number"
                              min="1"
                              max="168"
                              value={config.hardRules?.maxHoursPerWeek?.value || 40}
                              onChange={(e) => handleHardRuleChange('maxHoursPerWeek', {
                                ...config.hardRules?.maxHoursPerWeek,
                                value: parseInt(e.target.value)
                              })}
                              className="w-20"
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Coverage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="enforceMinimumCoverage">Enforce Minimum Coverage</Label>
                          <p className="text-sm text-gray-600">Never go below minimum</p>
                        </div>
                        <Switch
                          id="enforceMinimumCoverage"
                          checked={config.hardRules?.enforceMinimumCoverage || false}
                          onCheckedChange={(checked) => handleHardRuleChange('enforceMinimumCoverage', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="soft" className="mt-6">
              <div className="space-y-6">
                <div className="text-sm text-gray-600 mb-4">
                  Soft rules are preferences that the scheduler will try to follow but won't prevent schedule generation if violated.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Fairness & Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Hours Balance</Label>
                          <Badge variant="secondary">{config.softRules?.hoursBalance || 50}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">How much to prioritize equal hours distribution</p>
                        <Slider
                          value={[config.softRules?.hoursBalance || 50]}
                          onValueChange={([value]) => handleSoftRuleChange('hoursBalance', value)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Weekend Balance</Label>
                          <Badge variant="secondary">{config.softRules?.weekendBalance || 50}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Fair weekend shift distribution</p>
                        <Slider
                          value={[config.softRules?.weekendBalance || 50]}
                          onValueChange={([value]) => handleSoftRuleChange('weekendBalance', value)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Max Consecutive Days</Label>
                          <Badge variant="secondary">{config.hardRules?.maxConsecutiveDays || 6} days</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Maximum days an employee can work in a row</p>
                        <Slider
                          value={[config.hardRules?.maxConsecutiveDays || 6]}
                          onValueChange={([value]) => handleHardRuleChange('maxConsecutiveDays', value)}
                          min={3}
                          max={7}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>3 days</span>
                          <span>5 days</span>
                          <span>7 days</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Minimum Rest Hours</Label>
                          <Badge variant="secondary">{config.hardRules?.minRestHours || 10}h</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Minimum hours between shifts (prevents clopening)</p>
                        <Slider
                          value={[config.hardRules?.minRestHours || 10]}
                          onValueChange={([value]) => handleHardRuleChange('minRestHours', value)}
                          min={8}
                          max={16}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>8h</span>
                          <span>12h</span>
                          <span>16h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Settings className="w-5 h-5" />
                        Employee Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Respect Preferences</Label>
                          <Badge variant="secondary">{config.softRules?.respectPreferences || 50}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">How much to follow employee preferences</p>
                        <Slider
                          value={[config.softRules?.respectPreferences || 50]}
                          onValueChange={([value]) => handleSoftRuleChange('respectPreferences', value)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

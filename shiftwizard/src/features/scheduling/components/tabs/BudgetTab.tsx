import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSchedulingStore } from '../../store/useSchedulingStore';

export const BudgetTab = React.memo(function BudgetTab() {
  const { config, setBudget, costEstimate } = useSchedulingStore();
  const [weeklyBudget, setWeeklyBudget] = useState(config.budget?.weeklyLimit || 8000);
  const [dailyBudget, setDailyBudget] = useState(config.budget?.dailyLimit || 1200);
  const [targetCost, setTargetCost] = useState(config.budget?.targetCost || 7500);
  const [enableDailyLimit, setEnableDailyLimit] = useState(config.budget?.enableDailyLimit !== false);
  const [allowFlexibility, setAllowFlexibility] = useState(config.budget?.allowFlexibility !== false);

  // Memoize expensive calculations
  const budgetMetrics = useMemo(() => {
    const estimatedCost = costEstimate?.total || 0;
    const utilizationPercent = weeklyBudget > 0 ? (estimatedCost / weeklyBudget) * 100 : 0;
    const isOverBudget = estimatedCost > weeklyBudget;
    const isNearBudget = utilizationPercent > 90 && !isOverBudget;

    return {
      estimatedCost,
      utilizationPercent,
      isOverBudget,
      isNearBudget
    };
  }, [costEstimate?.total, weeklyBudget]);

  const { estimatedCost, utilizationPercent, isOverBudget, isNearBudget } = budgetMetrics;

  useEffect(() => {
    // Auto-save budget changes with validation
    const timer = setTimeout(() => {
      // Validate values before saving
      const validWeeklyBudget = Math.max(0, weeklyBudget || 0);
      const validDailyBudget = Math.max(0, dailyBudget || 0);
      const validTargetCost = Math.max(0, Math.min(targetCost || 0, validWeeklyBudget));

      setBudget({
        weeklyLimit: validWeeklyBudget,
        dailyLimit: enableDailyLimit ? validDailyBudget : undefined,
        targetCost: allowFlexibility ? validTargetCost : undefined,
        enableDailyLimit,
        allowFlexibility
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [weeklyBudget, dailyBudget, targetCost, enableDailyLimit, allowFlexibility, setBudget]);

  // Memoize style helpers
  const budgetStatusColor = useMemo(() => {
    if (isOverBudget) return 'text-red-600';
    if (isNearBudget) return 'text-yellow-600';
    return 'text-green-600';
  }, [isOverBudget, isNearBudget]);

  const budgetStatusIcon = useMemo(() => {
    if (isOverBudget) return <TrendingUp className="w-5 h-5 text-red-600" />;
    if (isNearBudget) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-green-600" />;
  }, [isOverBudget, isNearBudget]);

  return (
    <div className="space-y-6">
      {/* Budget Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Weekly Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${weeklyBudget.toLocaleString()}</span>
              <span className="text-sm text-gray-500">/ week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${budgetStatusColor}`}>
                  ${estimatedCost.toLocaleString()}
                </span>
              </div>
              {budgetStatusIcon}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Utilization</span>
                <span className={budgetStatusColor}>{utilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isOverBudget ? 'bg-red-600' : isNearBudget ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Available Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">
                ${Math.max(0, weeklyBudget - estimatedCost).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isOverBudget ? `Over budget by $${(estimatedCost - weeklyBudget).toLocaleString()}` : 'Remaining this week'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget exceeded!</strong> Current schedule costs ${estimatedCost.toLocaleString()}, which is $
            {(estimatedCost - weeklyBudget).toLocaleString()} over your weekly budget of ${weeklyBudget.toLocaleString()}.
            Consider reducing shift requirements or adjusting budget limits.
          </AlertDescription>
        </Alert>
      )}

      {isNearBudget && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Approaching budget limit.</strong> You're at {utilizationPercent.toFixed(1)}% of your weekly budget. Any
            additional shifts may exceed the limit.
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Labor Budget Configuration
          </CardTitle>
          <CardDescription>Set spending limits and targets for schedule optimization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Budget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weeklyBudget" className="text-base font-medium">
                  Weekly Budget Cap
                </Label>
                <p className="text-sm text-gray-600">Maximum labor cost per week (HARD limit)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">${weeklyBudget.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Slider
                id="weeklyBudget"
                value={[weeklyBudget]}
                onValueChange={([value]) => setWeeklyBudget(value)}
                min={1000}
                max={20000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$1,000</span>
                <span>$10,000</span>
                <span>$20,000</span>
              </div>
            </div>
            <Input
              type="number"
              value={weeklyBudget}
              onChange={(e) => setWeeklyBudget(parseFloat(e.target.value) || 0)}
              min={0}
              step={100}
              className="w-full"
              placeholder="Enter weekly budget"
            />
          </div>

          {/* Daily Budget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dailyBudget" className="text-base font-medium">
                  Daily Budget Cap
                </Label>
                <p className="text-sm text-gray-600">Maximum labor cost per day (optional)</p>
              </div>
              <Switch
                id="enableDailyLimit"
                checked={enableDailyLimit}
                onCheckedChange={setEnableDailyLimit}
              />
            </div>
            {enableDailyLimit && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold text-gray-900">${dailyBudget.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">per day</span>
                  </div>
                  <Slider
                    id="dailyBudget"
                    value={[dailyBudget]}
                    onValueChange={([value]) => setDailyBudget(value)}
                    min={100}
                    max={3000}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>$100</span>
                    <span>$1,500</span>
                    <span>$3,000</span>
                  </div>
                </div>
                <Input
                  type="number"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={50}
                  className="w-full"
                  placeholder="Enter daily budget"
                />
              </>
            )}
          </div>

          {/* Target Cost (Soft Goal) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="targetCost" className="text-base font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Target Cost (Soft Goal)
                </Label>
                <p className="text-sm text-gray-600">Ideal labor cost to aim for (flexible)</p>
              </div>
              <Switch
                id="allowFlexibility"
                checked={allowFlexibility}
                onCheckedChange={setAllowFlexibility}
              />
            </div>
            {allowFlexibility && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold text-blue-600">${targetCost.toLocaleString()}</span>
                    <Badge variant="secondary">Target</Badge>
                  </div>
                  <Slider
                    id="targetCost"
                    value={[targetCost]}
                    onValueChange={([value]) => setTargetCost(value)}
                    min={1000}
                    max={weeklyBudget}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>$1,000</span>
                    <span>${(weeklyBudget / 2).toLocaleString()}</span>
                    <span>${weeklyBudget.toLocaleString()}</span>
                  </div>
                </div>
                <Input
                  type="number"
                  value={targetCost}
                  onChange={(e) => setTargetCost(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={weeklyBudget}
                  step={100}
                  className="w-full"
                  placeholder="Enter target cost"
                />
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    The scheduler will try to get close to ${targetCost.toLocaleString()} while staying under $
                    {weeklyBudget.toLocaleString()}.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          {/* Cost Breakdown (if available) */}
          {costEstimate && costEstimate.byRole && Object.keys(costEstimate.byRole).length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-medium">Cost Breakdown by Role</Label>
              <div className="space-y-2">
                {Object.entries(costEstimate.byRole).map(([role, cost]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{role}</span>
                    <span className="text-sm font-semibold">${(cost as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">💡 Budget Tips for Restaurant GMs</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Aim for 25-35% labor cost as percentage of revenue</li>
              <li>Set weekly budget based on projected sales for the week</li>
              <li>Use daily limits to prevent overstaffing on slow days</li>
              <li>Target cost helps optimize without hitting hard cap every week</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

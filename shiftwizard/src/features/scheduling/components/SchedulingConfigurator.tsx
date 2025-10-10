// @ts-nocheck
/**
 * Main scheduling configuration interface
 * Tabbed UI with live validation, conflict detection, and simulation
 */
// @ts-nocheck
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchedulingStore } from '../store/useSchedulingStore';
import { SummaryBar } from './shared/SummaryBar';
import { BusinessHoursTab } from './tabs/BusinessHoursTab';
import { RolesCoverageTab } from './tabs/RolesCoverageTab';
import { EmployeesTab } from './tabs/EmployeesTab';
import { RulesTab } from './tabs/RulesTab';
import { BudgetTab } from './tabs/BudgetTab';
import { ReviewSimulateTab } from './tabs/ReviewSimulateTab';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Users,
  UserCog,
  Shield,
  DollarSign,
  PlayCircle,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';

interface SchedulingConfiguratorProps {
  onSave?: (config: any) => void;
  onRun?: (config: any) => void;
}

export function SchedulingConfigurator({ onSave, onRun }: SchedulingConfiguratorProps) {
  const { config, activeTab, setActiveTab, exportConfig, importConfig, reset } = useSchedulingStore();

  const handleExport = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster86-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        importConfig(text);
      }
    };
    input.click();
  };

  const handleSave = () => {
    const json = exportConfig();
    onSave?.(JSON.parse(json));
  };

  const handleRun = () => {
    const json = exportConfig();
    onRun?.(JSON.parse(json));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Configuration</h1>
            <p className="text-sm text-gray-500 mt-1">
              Set up your scheduling parameters • All changes auto-save
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave}>
              Save Config
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <SummaryBar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="business-hours" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Business Hours</span>
            </TabsTrigger>
            <TabsTrigger value="roles-coverage" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Roles & Coverage</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Rules</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Review & Run</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business-hours" className="mt-0">
            <BusinessHoursTab />
          </TabsContent>

          <TabsContent value="roles-coverage" className="mt-0">
            <RolesCoverageTab />
          </TabsContent>

          <TabsContent value="employees" className="mt-0">
            <EmployeesTab />
          </TabsContent>

          <TabsContent value="rules" className="mt-0">
            <RulesTab />
          </TabsContent>

          <TabsContent value="budget" className="mt-0">
            <BudgetTab />
          </TabsContent>

          <TabsContent value="review" className="mt-0">
            <ReviewSimulateTab onRun={handleRun} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

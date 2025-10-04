
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, AppSettings } from '@/api/entities';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';
import { debounce } from 'lodash';

const timeZones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
];

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const settingsId = useRef(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        if (currentUser.role === 'admin') {
          const existingSettings = await AppSettings.list();
          if (existingSettings.length > 0) {
            setSettings(existingSettings[0]);
            settingsId.current = existingSettings[0].id;
          } else {
            // If no settings exist, create with defaults
            const defaultSettings = {
              organization_name: "Shift Wizard Inc.",
              time_zone: "America/New_York",
              schedule_start_day: "Monday",
              standard_shift_duration: 8,
              max_weekly_hours: 40
            };
            setSettings(defaultSettings);
          }
        }
      } catch (error) {
        console.error("Error initializing settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  const debouncedSave = useMemo(
    () => debounce(async (newSettings) => {
      setIsSaving(true);
      try {
        if (settingsId.current) {
          await AppSettings.update(settingsId.current, newSettings);
        } else {
          const created = await AppSettings.create(newSettings);
          settingsId.current = created.id;
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        console.error("Failed to save settings:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1500),
    [] // Empty dependency array means this is created only once
  );

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    debouncedSave(newSettings);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="glass-card p-8 rounded-xl text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must be an administrator to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            App Settings
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage organization-wide settings and preferences.
          </p>
        </div>
        <div className="flex items-center gap-2 h-8">
          {isSaving && (
            <>
              <Save className="w-4 h-4 animate-pulse" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
            </>
          )}
          {showSuccess && !isSaving && (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">Saved!</span>
            </>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>General settings for your company.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={settings.organization_name || ''}
                onChange={(e) => handleSettingChange('organization_name', e.target.value)}
                className="modern-button"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-zone">Default Time Zone</Label>
              <Select
                value={settings.time_zone}
                onValueChange={(value) => handleSettingChange('time_zone', value)}
              >
                <SelectTrigger id="time-zone" className="modern-button">
                  <SelectValue placeholder="Select a time zone" />
                </SelectTrigger>
                <SelectContent>
                  {timeZones.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Scheduling Defaults</CardTitle>
          <CardDescription>Default parameters for generating new schedules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-day">Schedule Start Day</Label>
              <Select
                value={settings.schedule_start_day}
                onValueChange={(value) => handleSettingChange('schedule_start_day', value)}
              >
                <SelectTrigger id="start-day" className="modern-button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                  <SelectItem value="Monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-duration">Standard Shift (hours)</Label>
              <Input
                id="shift-duration"
                type="number"
                min="1"
                max="24"
                value={settings.standard_shift_duration || ''}
                onChange={(e) => handleSettingChange('standard_shift_duration', parseFloat(e.target.value))}
                className="modern-button"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-hours">Max Weekly Hours</Label>
              <Input
                id="max-hours"
                type="number"
                min="1"
                max="80"
                value={settings.max_weekly_hours || ''}
                onChange={(e) => handleSettingChange('max_weekly_hours', parseFloat(e.target.value))}
                className="modern-button"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

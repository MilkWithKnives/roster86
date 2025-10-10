// @ts-nocheck
/**
 * Business Hours configuration tab
 * Weekly grid with drag handles for open/close times
 */
import React from 'react';
import { useSchedulingStore } from '../../store/useSchedulingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DAYS_OF_WEEK } from '../../types';
import { Clock, Copy } from 'lucide-react';

export function BusinessHoursTab() {
  const { config, setBusinessHours } = useSchedulingStore();

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    const hours = config.businessHours[day];
    setBusinessHours(day, {
      ...hours,
      [field]: value,
    });
  };

  const handleToggle = (day: string, field: 'closed' | 'is24h', value: boolean) => {
    const hours = config.businessHours[day];
    setBusinessHours(day, {
      ...hours,
      [field]: value,
    });
  };

  const copyToAll = (sourceDay: string) => {
    const sourceHours = config.businessHours[sourceDay];
    DAYS_OF_WEEK.forEach(day => {
      if (day !== sourceDay) {
        setBusinessHours(day, { ...sourceHours });
      }
    });
  };

  const applyToWeekdays = (sourceDay: string) => {
    const sourceHours = config.businessHours[sourceDay];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    weekdays.forEach(day => {
      if (day !== sourceDay) {
        setBusinessHours(day, { ...sourceHours });
      }
    });
  };

  const applyToWeekend = (sourceDay: string) => {
    const sourceHours = config.businessHours[sourceDay];
    const weekend = ['saturday', 'sunday'];
    weekend.forEach(day => {
      if (day !== sourceDay) {
        setBusinessHours(day, { ...sourceHours });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>
            Set your restaurant's open and close times for each day. Times can cross midnight if you close after 12am.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const hours = config.businessHours[day];
              const isWeekend = day === 'saturday' || day === 'sunday';

              return (
                <div
                  key={day}
                  className={`p-4 rounded-lg border ${
                    hours.closed
                      ? 'bg-gray-50 border-gray-200'
                      : isWeekend
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Day Name */}
                    <div className="w-24">
                      <span className="font-medium text-gray-900">
                        {dayNames[day as keyof typeof dayNames]}
                      </span>
                    </div>

                    {/* Time Inputs */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-gray-600 w-12">Open</Label>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                          disabled={hours.closed || hours.is24h}
                          className="w-32"
                        />
                      </div>

                      <span className="text-gray-400">→</span>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-gray-600 w-12">Close</Label>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                          disabled={hours.closed || hours.is24h}
                          className="w-32"
                        />
                      </div>

                      {/* 24h Indicator */}
                      {hours.is24h && (
                        <span className="text-sm font-medium text-blue-600 px-2 py-1 bg-blue-100 rounded">
                          24 Hours
                        </span>
                      )}

                      {/* Closed Indicator */}
                      {hours.closed && (
                        <span className="text-sm font-medium text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          Closed
                        </span>
                      )}
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hours.is24h}
                          onCheckedChange={(checked) => handleToggle(day, 'is24h', checked)}
                          disabled={hours.closed}
                        />
                        <Label className="text-sm text-gray-600">24h</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hours.closed}
                          onCheckedChange={(checked) => handleToggle(day, 'closed', checked)}
                        />
                        <Label className="text-sm text-gray-600">Closed</Label>
                      </div>

                      {/* Copy Menu */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const result = confirm(
                            `Copy ${dayNames[day as keyof typeof dayNames]}'s hours to:\n\n` +
                            `• All days\n• Weekdays only\n• Weekend only\n\n` +
                            `Click OK for all, or Cancel to choose.`
                          );
                          if (result) {
                            copyToAll(day);
                          } else {
                            const choice = prompt('Enter: weekdays, weekend, or cancel');
                            if (choice === 'weekdays') applyToWeekdays(day);
                            else if (choice === 'weekend') applyToWeekend(day);
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Helper Text */}
                  {!hours.closed && !hours.is24h && (
                    <div className="mt-2 text-xs text-gray-500">
                      {hours.open > hours.close && (
                        <span className="text-amber-600 font-medium">
                          ⚠️ Closes after midnight (+1 day)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const template = {
                  open: '09:00',
                  close: '22:00',
                  closed: false,
                  is24h: false,
                };
                DAYS_OF_WEEK.forEach(day => setBusinessHours(day, template));
              }}
            >
              Apply 9am-10pm to All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                  setBusinessHours(day, { open: '11:00', close: '22:00', closed: false, is24h: false });
                });
                ['saturday', 'sunday'].forEach(day => {
                  setBusinessHours(day, { open: '10:00', close: '23:00', closed: false, is24h: false });
                });
              }}
            >
              Weekday 11am-10pm, Weekend 10am-11pm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-sm text-blue-900 space-y-2">
            <p className="font-medium">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-blue-800">
              <li>Coverage intervals must fit within these hours</li>
              <li>If you close after midnight (e.g., 2am), select a close time before your open time</li>
              <li>Use the copy button to quickly duplicate hours across days</li>
              <li>24h mode is useful for diners or 24/7 operations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

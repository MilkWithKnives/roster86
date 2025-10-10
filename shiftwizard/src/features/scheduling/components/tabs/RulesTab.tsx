// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RulesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Rules</CardTitle>
        <CardDescription>Configure hard constraints and soft preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Coming soon: Rules configuration with hard/soft toggles</p>
      </CardContent>
    </Card>
  );
}

// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EmployeesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees & Preferences</CardTitle>
        <CardDescription>Manage employee availability and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Coming soon: Employee editor with availability grid</p>
      </CardContent>
    </Card>
  );
}

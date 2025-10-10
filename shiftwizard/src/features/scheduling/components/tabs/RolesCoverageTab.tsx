// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RolesCoverageTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles & Coverage</CardTitle>
        <CardDescription>Define coverage requirements for each role</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Coming soon: Coverage timeline editor</p>
      </CardContent>
    </Card>
  );
}

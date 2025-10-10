// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BudgetTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Budget</CardTitle>
        <CardDescription>Set weekly labor budget and constraints</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Coming soon: Budget configuration with live estimates</p>
      </CardContent>
    </Card>
  );
}

// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

interface ReviewSimulateTabProps {
  onRun?: () => void;
}

export function ReviewSimulateTab({ onRun }: ReviewSimulateTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Run</CardTitle>
          <CardDescription>Review your configuration and run the scheduler</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-4">Coming soon: Configuration summary and what-if simulator</p>
          <Button onClick={onRun} size="lg">
            <PlayCircle className="w-5 h-5 mr-2" />
            Run Scheduler
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

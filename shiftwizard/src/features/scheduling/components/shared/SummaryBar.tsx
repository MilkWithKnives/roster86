// @ts-nocheck
/**
 * Sticky summary bar showing key metrics
 */
import React from 'react';
import { useSchedulingStore } from '../../store/useSchedulingStore';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';

export function SummaryBar() {
  const { conflicts, coverageHealth, costEstimate } = useSchedulingStore();

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Conflicts */}
          <div className="flex items-center gap-2">
            {errorCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm font-medium">
              {errorCount === 0 ? 'No errors' : `${errorCount} error${errorCount > 1 ? 's' : ''}`}
            </span>
            {warningCount > 0 && (
              <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Coverage Health */}
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${getHealthColor(coverageHealth.score)}`} />
            <span className="text-sm text-gray-600">Coverage:</span>
            <Badge className={getHealthBadge(coverageHealth.score)}>
              {coverageHealth.score}%
            </Badge>
          </div>

          {/* Cost Estimate */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Est. Cost:</span>
            <span className="text-sm font-semibold">
              ${costEstimate.total.toFixed(0)}/week
            </span>
            <span className="text-xs text-gray-500">
              ({costEstimate.breakdown.totalHours.toFixed(0)}h)
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {coverageHealth.understaffedSlots > 0 && (
            <span className="text-red-600">
              {coverageHealth.understaffedSlots} understaffed slot{coverageHealth.understaffedSlots > 1 ? 's' : ''}
            </span>
          )}
          {coverageHealth.totalSlots > 0 && (
            <span>
              {coverageHealth.totalSlots} total slot{coverageHealth.totalSlots > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

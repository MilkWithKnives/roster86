import React from "react";
import { X, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

const issueConfig = {
  success: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-50"
  },
  error: {
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50"
  }
};

export default function CoverageCheckResults({ issues, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="neuro-card max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="neuro-icon w-10 h-10 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-700">Coverage Check Report</h2>
                <p className="text-sm text-gray-500">Analysis of potential scheduling gaps.</p>
              </div>
            </div>
            <div className="neuro-button p-2 cursor-pointer" onClick={onClose}>
              <X className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto">
          {issues.map((issue, index) => {
            const config = issueConfig[issue.type] || issueConfig.warning;
            const Icon = config.icon;
            return (
              <div key={index} className={`neuro-card-inset p-4 flex items-start gap-4 ${config.bg}`}>
                <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${config.color}`} />
                <p className={`text-sm font-medium ${config.color}`}>{issue.message}</p>
              </div>
            );
          })}
           {issues.length === 0 && (
             <div className="neuro-card-inset p-6 flex flex-col items-center gap-4 bg-green-50">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <h3 className="text-lg font-semibold text-green-700">All Checks Passed!</h3>
                <p className="text-sm text-green-600 text-center">No coverage gaps, overlaps, or configuration errors found in your shift templates.</p>
             </div>
           )}
        </div>
        
        <div className="p-4 border-t border-gray-300 mt-auto">
          <div 
            className="neuro-button w-full py-3 text-center cursor-pointer"
            onClick={onClose}
          >
            <span className="font-medium text-gray-600">Close Report</span>
          </div>
        </div>
      </div>
    </div>
  );
}
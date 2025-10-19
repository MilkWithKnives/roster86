import { useState, useEffect } from 'react';
import { 
    Users, 
    Calendar, 
    Clock, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle, 
    Activity,
    Wifi,
    WifiOff
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebSocket } from "@/contexts/WebSocketContext";
import apiClient from "@/api/apiClient";

const MetricCard = ({ title, value, icon: Icon, trend, isLoading, gradient, status, subtitle }) => (
    <div className={`premium-card p-6 overflow-hidden relative ${gradient}`}>
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-4 w-24 bg-white/20" />
                <Skeleton className="h-8 w-16 bg-white/20" />
            </div>
        ) : (
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-white/80">
                                {title}
                            </p>
                            {status && (
                                <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                        status === 'good' ? 'border-green-300 text-green-100' :
                                        status === 'warning' ? 'border-yellow-300 text-yellow-100' :
                                        'border-red-300 text-red-100'
                                    }`}
                                >
                                    {status}
                                </Badge>
                            )}
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">
                            {value}
                        </h3>
                        {subtitle && (
                            <p className="text-sm text-white/70">{subtitle}</p>
                        )}
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-white" />
                    </div>
                </div>
                {trend && (
                    <div className="flex items-center text-sm bg-white/15 backdrop-blur-sm px-3 py-2 rounded-full">
                        <TrendingUp className="w-4 h-4 mr-2 text-white/90" />
                        <span className="text-white/90 font-medium">{trend}</span>
                    </div>
                )}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/10 -translate-x-4 translate-y-4"></div>
            </div>
        )}
    </div>
);

const CoverageAlert = ({ uncoveredShifts = [] }) => {
    if (uncoveredShifts.length === 0) {
        return (
            <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                    ✅ All shifts are properly covered for this week!
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
                <div className="space-y-1">
                    <p className="font-medium">⚠️ {uncoveredShifts.length} shifts need coverage:</p>
                    {uncoveredShifts.slice(0, 3).map((shift, index) => (
                        <p key={index} className="text-sm">
                            • {shift.day_of_week} {shift.start_time}-{shift.end_time} ({shift.gap} staff needed)
                        </p>
                    ))}
                    {uncoveredShifts.length > 3 && (
                        <p className="text-sm font-medium">
                            + {uncoveredShifts.length - 3} more shifts
                        </p>
                    )}
                </div>
            </AlertDescription>
        </Alert>
    );
};

const ConnectionStatus = ({ isConnected, connectionError }) => (
    <div className="flex items-center gap-2 text-sm">
        {isConnected ? (
            <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">Live Data</span>
            </>
        ) : (
            <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-red-600 font-medium">
                    {connectionError ? 'Connection Error' : 'Connecting...'}
                </span>
            </>
        )}
    </div>
);

export default function LiveMetricsDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const { isConnected, connectionError } = useWebSocket();

    // Fetch initial metrics
    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/metrics/dashboard');
            if (response.data.success) {
                setMetrics(response.data.data);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    // Listen for real-time metrics updates via WebSocket
    useEffect(() => {
        const handleMetricsUpdate = (event) => {
            console.log('📊 Dashboard received metrics update:', event.detail);
            setMetrics(event.detail);
            setLastUpdate(new Date());
        };

        window.addEventListener('metrics-update', handleMetricsUpdate);
        return () => window.removeEventListener('metrics-update', handleMetricsUpdate);
    }, []);

    // Listen for coverage alerts
    useEffect(() => {
        const handleCoverageAlert = (event) => {
            console.log('🚨 Dashboard received coverage alert:', event.detail);
            // Force refresh metrics when alert is received
            fetchMetrics();
        };

        window.addEventListener('coverage-alert', handleCoverageAlert);
        return () => window.removeEventListener('coverage-alert', handleCoverageAlert);
    }, []);

    if (isLoading && !metrics) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Live Dashboard</h2>
                    <ConnectionStatus isConnected={isConnected} connectionError={connectionError} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <MetricCard key={index} isLoading={true} gradient="gradient-primary" />
                    ))}
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No metrics data available</p>
            </div>
        );
    }

    const { coverage, employees, shifts } = metrics;

    const cardConfigs = [
        {
            title: "Coverage Rate",
            value: `${coverage?.coveragePercentage || 0}%`,
            subtitle: `${coverage?.coveredShifts || 0}/${coverage?.totalShifts || 0} shifts`,
            icon: CheckCircle,
            trend: coverage?.uncoveredCount > 0 ? `${coverage.uncoveredCount} gaps` : "Full coverage",
            gradient: "gradient-primary",
            status: coverage?.coveragePercentage >= 90 ? 'good' : 
                   coverage?.coveragePercentage >= 70 ? 'warning' : 'critical'
        },
        {
            title: "Active Employees",
            value: employees?.totalEmployees || 0,
            subtitle: `Avg: ${employees?.averageHours || 0}h/week`,
            icon: Users,
            trend: "Available for scheduling",
            gradient: "gradient-secondary",
            status: 'good'
        },
        {
            title: "Shift Templates",
            value: shifts?.totalShiftTemplates || 0,
            subtitle: "Available patterns",
            icon: Clock,
            trend: `${shifts?.weeklyHours || 0}h total`,
            gradient: "gradient-tertiary",
            status: 'good'
        },
        {
            title: "Active Schedules",
            value: shifts?.activeSchedules || 0,
            subtitle: "Draft & Published",
            icon: Calendar,
            trend: "Current period",
            gradient: "gradient-primary",
            status: 'good'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Live Dashboard</h2>
                    {lastUpdate && (
                        <p className="text-sm text-gray-500 mt-1">
                            Last updated: {lastUpdate.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <ConnectionStatus isConnected={isConnected} connectionError={connectionError} />
            </div>

            {/* Coverage Alert */}
            <CoverageAlert uncoveredShifts={coverage?.uncoveredShifts || []} />

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cardConfigs.map((config) => (
                    <MetricCard
                        key={config.title}
                        {...config}
                        isLoading={false}
                    />
                ))}
            </div>

            {/* Recent Activity */}
            {metrics.activity && metrics.activity.length > 0 && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recent Activity
                    </h3>
                    <div className="space-y-2">
                        {metrics.activity.slice(0, 5).map((activity, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                <span className="text-sm text-gray-700">{activity.description}</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
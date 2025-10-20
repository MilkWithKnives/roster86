import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Users, Activity, Settings, Zap, Clock } from "lucide-react";
import LiveMetricsDashboard from "@/components/dashboard/LiveMetricsDashboard";
import SchedulingWorkflow from "@/components/scheduling/SchedulingWorkflow";
import { useWebSocket } from "@/contexts/WebSocketContext";
import apiClient from "@/api/apiClient";

export default function Scheduling() {
    const [activeSchedule, setActiveSchedule] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const { isConnected, connectionStatus } = useWebSocket();

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            
            // Load user info
            const userResponse = await apiClient.get('/auth/me');
            setCurrentUser(userResponse.data.data);
            
            // Load schedules
            const schedulesResponse = await apiClient.get('/schedules');
            setSchedules(schedulesResponse.data.data || []);
            
            // Set active schedule (most recent or create new)
            const activeScheduleData = schedulesResponse.data.data?.find(s => s.status === 'active') || 
                                      schedulesResponse.data.data?.[0];
            setActiveSchedule(activeScheduleData);
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleComplete = async (results, appliedSuggestion) => {
        console.log('✅ Schedule completed:', { results, appliedSuggestion });
        
        // Reload schedules to get updated data
        await loadInitialData();
        
        // Show success message or redirect as needed
    };

    const getConnectionStatusColor = () => {
        if (isConnected) return 'bg-green-100 text-green-800 border-green-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    const getConnectionStatusText = () => {
        if (isConnected) return 'Live Updates Active';
        return `Disconnected - ${connectionStatus}`;
    };

    const canManageSchedules = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading scheduling system...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Intelligent Scheduling System
                        </h1>
                        <p className="text-gray-600">
                            AI-powered workforce optimization with real-time insights
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Badge className={getConnectionStatusColor()}>
                            <Activity className="w-3 h-3 mr-1" />
                            {getConnectionStatusText()}
                        </Badge>
                        
                        {currentUser && (
                            <Badge variant="outline">
                                <Users className="w-3 h-3 mr-1" />
                                {currentUser.full_name} ({currentUser.role})
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Permission Check */}
                {!canManageSchedules && (
                    <Alert className="border-orange-200 bg-orange-50">
                        <Settings className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                            You have read-only access to the scheduling system. Contact an administrator for scheduling permissions.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Content */}
                <Tabs defaultValue="workflow" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
                        <TabsTrigger value="workflow" className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Workflow
                        </TabsTrigger>
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Live Metrics
                        </TabsTrigger>
                        <TabsTrigger value="schedules" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Schedules
                        </TabsTrigger>
                    </TabsList>

                    {/* Workflow Tab */}
                    <TabsContent value="workflow" className="space-y-6">
                        {canManageSchedules ? (
                            <SchedulingWorkflow 
                                scheduleId={activeSchedule?.id}
                                onScheduleComplete={handleScheduleComplete}
                            />
                        ) : (
                            <Card className="premium-card">
                                <CardContent className="p-6">
                                    <div className="text-center py-8">
                                        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            Manager Access Required
                                        </h3>
                                        <p className="text-gray-600">
                                            Only managers and administrators can access the scheduling workflow.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Live Metrics Tab */}
                    <TabsContent value="dashboard" className="space-y-6">
                        <LiveMetricsDashboard />
                    </TabsContent>

                    {/* Schedules Tab */}
                    <TabsContent value="schedules" className="space-y-6">
                        <div className="grid gap-6">
                            {/* Current Schedule Overview */}
                            {activeSchedule && (
                                <Card className="premium-card">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                                Current Schedule
                                            </CardTitle>
                                            <Badge 
                                                variant={activeSchedule.status === 'active' ? 'default' : 'secondary'}
                                                className="capitalize"
                                            >
                                                {activeSchedule.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-600">Schedule Period</p>
                                                <p className="font-medium">
                                                    {new Date(activeSchedule.start_date).toLocaleDateString()} - 
                                                    {new Date(activeSchedule.end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-600">Total Assignments</p>
                                                <p className="font-medium">
                                                    {activeSchedule.total_assignments || 'Not calculated'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-600">Last Updated</p>
                                                <p className="font-medium">
                                                    {new Date(activeSchedule.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Schedule History */}
                            <Card className="premium-card">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-purple-600" />
                                        Schedule History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {schedules.length > 0 ? (
                                        <div className="space-y-3">
                                            {schedules.map((schedule) => (
                                                <div 
                                                    key={schedule.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            schedule.status === 'active' 
                                                                ? 'bg-green-500' 
                                                                : schedule.status === 'draft' 
                                                                    ? 'bg-yellow-500' 
                                                                    : 'bg-gray-400'
                                                        }`}></div>
                                                        <div>
                                                            <p className="font-medium">{schedule.name}</p>
                                                            <p className="text-sm text-gray-600">
                                                                {new Date(schedule.start_date).toLocaleDateString()} - 
                                                                {new Date(schedule.end_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge 
                                                        variant={schedule.status === 'active' ? 'default' : 'secondary'}
                                                        className="capitalize"
                                                    >
                                                        {schedule.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p>No schedules found</p>
                                            <p className="text-sm mt-1">Create your first schedule using the workflow tab</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
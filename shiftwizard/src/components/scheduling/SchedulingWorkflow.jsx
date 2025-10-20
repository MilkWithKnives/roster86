import { useState, useEffect } from 'react';
import {
    Play,
    Brain,
    CheckCircle,
    AlertTriangle,
    Users,
    Calendar,
    Loader2,
    RefreshCw,
    Settings,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useWebSocket } from "@/contexts/WebSocketContext";
import AISuggestions from "./AISuggestions";
import apiClient from "@/api/apiClient";

const WorkflowStep = ({ step, title, description, status, progress, children }) => {
    const getStepIcon = () => {
        switch (status) {
            case 'pending': return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">{step}</div>;
            case 'running': return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
            case 'completed': return <CheckCircle className="w-8 h-8 text-green-600" />;
            case 'error': return <AlertTriangle className="w-8 h-8 text-red-600" />;
            default: return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">{step}</div>;
        }
    };

    const getStepColor = () => {
        switch (status) {
            case 'running': return 'border-blue-200 bg-blue-50';
            case 'completed': return 'border-green-200 bg-green-50';
            case 'error': return 'border-red-200 bg-red-50';
            default: return 'border-gray-200 bg-gray-50';
        }
    };

    return (
        <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${getStepColor()}`}>
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                    {getStepIcon()}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{description}</p>
                    
                    {status === 'running' && progress !== undefined && (
                        <div className="mb-3">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                        </div>
                    )}
                    
                    {children}
                </div>
            </div>
        </div>
    );
};

const ConstraintsDialog = ({ isOpen, onOpenChange, constraints, onSave }) => {
    const [localConstraints, setLocalConstraints] = useState(constraints);

    const handleSave = () => {
        onSave(localConstraints);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scheduling Constraints</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>Time Limit (seconds)</Label>
                        <Slider
                            value={[localConstraints.time_limit]}
                            onValueChange={(value) => setLocalConstraints({...localConstraints, time_limit: value[0]})}
                            max={300}
                            min={10}
                            step={10}
                        />
                        <p className="text-sm text-gray-500">{localConstraints.time_limit} seconds</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <Label>Prefer Fairness</Label>
                        <Switch
                            checked={localConstraints.prefer_fairness}
                            onCheckedChange={(checked) => setLocalConstraints({...localConstraints, prefer_fairness: checked})}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <Label>Allow Overtime</Label>
                        <Switch
                            checked={localConstraints.allow_overtime}
                            onCheckedChange={(checked) => setLocalConstraints({...localConstraints, allow_overtime: checked})}
                        />
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Constraints
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function SchedulingWorkflow({ scheduleId, onScheduleComplete }) {
    const [workflowState, setWorkflowState] = useState('idle'); // idle, running, completed, error
    const [currentStep, setCurrentStep] = useState(1);
    // Removed unused schedulingJobId state
    const [schedulingResults, setSchedulingResults] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [constraints, setConstraints] = useState({
        time_limit: 60,
        prefer_fairness: true,
        allow_overtime: false
    });
    const [constraintsDialogOpen, setConstraintsDialogOpen] = useState(false);
    const [progress, setProgress] = useState({
        step1: 0, // Data preparation
        step2: 0, // Algorithm execution
        step3: 0, // AI suggestions
        step4: 0  // Finalization
    });
    const { isConnected } = useWebSocket();

    // Listen for WebSocket updates
    useEffect(() => {
        const handleSchedulingProgress = (event) => {
            const data = event.detail;
            console.log('📡 Received scheduling progress:', data);
            
            if (data.status === 'starting') {
                setCurrentStep(1);
                setProgress(prev => ({...prev, step1: 25}));
            } else if (data.status === 'running') {
                setCurrentStep(2);
                setProgress(prev => ({...prev, step1: 100, step2: data.progress || 50}));
            } else if (data.status === 'completed') {
                setCurrentStep(3);
                setProgress(prev => ({...prev, step1: 100, step2: 100, step3: 0}));
                setSchedulingResults(data.results);
                
                // Trigger AI suggestions if there are coverage gaps
                if (data.results?.coverage_gaps?.length > 0) {
                    setShowSuggestions(true);
                }
            } else if (data.status === 'error') {
                setWorkflowState('error');
                setCurrentStep(data.step || currentStep);
            }
        };

        const handleAISuggestionsReady = (event) => {
            console.log('🤖 AI suggestions ready:', event.detail);
            setCurrentStep(4);
            setProgress(prev => ({...prev, step3: 100, step4: 100}));
            setWorkflowState('completed');
        };

        const handleSuggestionApplied = (event) => {
            console.log('✅ Suggestion applied:', event.detail);
            // Could trigger schedule regeneration or other actions
        };

        window.addEventListener('scheduling-progress', handleSchedulingProgress);
        window.addEventListener('ai-suggestions-ready', handleAISuggestionsReady);
        window.addEventListener('suggestion-applied', handleSuggestionApplied);

        return () => {
            window.removeEventListener('scheduling-progress', handleSchedulingProgress);
            window.removeEventListener('ai-suggestions-ready', handleAISuggestionsReady);
            window.removeEventListener('suggestion-applied', handleSuggestionApplied);
        };
    }, [currentStep]);

    const startSchedulingWorkflow = async () => {
        try {
            setWorkflowState('running');
            setCurrentStep(1);
            setProgress({ step1: 0, step2: 0, step3: 0, step4: 0 });
            setSchedulingResults(null);
            setShowSuggestions(false);

            console.log('🚀 Starting scheduling workflow with constraints:', constraints);

            const response = await apiClient.post('/scheduling/run', constraints);
            
                if (response.data.success) {
                console.log('✅ Scheduling job started:', response.data.data.jobId);
            } else {
                throw new Error(response.data.message || 'Failed to start scheduling');
            }
        } catch (error) {
            console.error('❌ Failed to start scheduling workflow:', error);
            setWorkflowState('error');
            setCurrentStep(1);
        }
    };

    const resetWorkflow = () => {
        setWorkflowState('idle');
        setCurrentStep(1);
        setSchedulingResults(null);
        setShowSuggestions(false);
        setProgress({ step1: 0, step2: 0, step3: 0, step4: 0 });
    };

    const handleSuggestionApplied = (appliedSuggestion) => {
        console.log('✅ Applied suggestion:', appliedSuggestion);
        onScheduleComplete?.(schedulingResults, appliedSuggestion);
    };

    const getWorkflowStatus = () => {
        if (workflowState === 'idle') return 'Ready to generate schedule';
        if (workflowState === 'running') return 'Generating intelligent schedule...';
        if (workflowState === 'completed') return 'Schedule complete with AI suggestions';
        if (workflowState === 'error') return 'Scheduling failed - check logs';
        return 'Unknown status';
    };

    const getStepStatus = (step) => {
        if (currentStep > step) return 'completed';
        if (currentStep === step && workflowState === 'running') return 'running';
        if (currentStep === step && workflowState === 'error') return 'error';
        return 'pending';
    };

    return (
        <div className="space-y-6">
            {/* Workflow Header */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Intelligent Scheduling Workflow</CardTitle>
                                <p className="text-sm text-gray-600 mt-1">
                                    {getWorkflowStatus()}
                                    {isConnected && (
                                        <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">
                                            Live Updates
                                        </Badge>
                                    )}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Dialog open={constraintsDialogOpen} onOpenChange={setConstraintsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Constraints
                                    </Button>
                                </DialogTrigger>
                                <ConstraintsDialog
                                    isOpen={constraintsDialogOpen}
                                    onOpenChange={setConstraintsDialogOpen}
                                    constraints={constraints}
                                    onSave={setConstraints}
                                />
                            </Dialog>

                            {workflowState === 'idle' ? (
                                <Button onClick={startSchedulingWorkflow} className="premium-button">
                                    <Play className="w-4 h-4 mr-2" />
                                    Generate Schedule
                                </Button>
                            ) : workflowState === 'running' ? (
                                <Button disabled className="premium-button">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </Button>
                            ) : (
                                <Button onClick={resetWorkflow} variant="outline">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    New Schedule
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Workflow Steps */}
            {(workflowState !== 'idle') && (
                <div className="space-y-4">
                    <WorkflowStep
                        step={1}
                        title="Data Preparation"
                        description="Gathering employee availability, shift requirements, and constraints"
                        status={getStepStatus(1)}
                        progress={progress.step1}
                    >
                        {currentStep >= 1 && (
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>Employees analyzed</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Shifts configured</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Settings className="w-4 h-4" />
                                    <span>Constraints applied</span>
                                </div>
                            </div>
                        )}
                    </WorkflowStep>

                    <WorkflowStep
                        step={2}
                        title="Algorithm Execution"
                        description="Python OR-Tools engine optimizing schedule with constraint satisfaction"
                        status={getStepStatus(2)}
                        progress={progress.step2}
                    >
                        {currentStep >= 2 && (
                            <div className="text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Running constraint optimization...</span>
                                </div>
                            </div>
                        )}
                    </WorkflowStep>

                    <WorkflowStep
                        step={3}
                        title="AI Analysis"
                        description="Analyzing coverage gaps and generating intelligent suggestions"
                        status={getStepStatus(3)}
                        progress={progress.step3}
                    >
                        {currentStep >= 3 && schedulingResults && (
                            <div className="space-y-2">
                                {schedulingResults.coverage_gaps?.length > 0 ? (
                                    <Alert className="border-orange-200 bg-orange-50">
                                        <Brain className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-orange-800">
                                            Found {schedulingResults.coverage_gaps.length} coverage gaps. 
                                            AI is generating suggestions...
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <Alert className="border-green-200 bg-green-50">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                            Perfect schedule! All shifts are covered with no conflicts.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </WorkflowStep>

                    <WorkflowStep
                        step={4}
                        title="Schedule Complete"
                        description="Review results and apply AI suggestions as needed"
                        status={getStepStatus(4)}
                        progress={progress.step4}
                    >
                        {currentStep >= 4 && schedulingResults && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Assignments:</span>
                                        <span className="font-medium">{schedulingResults.solution?.assignments?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Cost:</span>
                                        <span className="font-medium">${schedulingResults.solution?.total_cost?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Solve Time:</span>
                                        <span className="font-medium">{schedulingResults.solution?.solve_time?.toFixed(1) || 0}s</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Coverage Gaps:</span>
                                        <span className={`font-medium ${schedulingResults.coverage_gaps?.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {schedulingResults.coverage_gaps?.length || 0}
                                        </span>
                                    </div>
                                </div>
                                
                                {schedulingResults.coverage_gaps?.length > 0 && (
                                    <Button 
                                        onClick={() => setShowSuggestions(true)}
                                        className="w-full premium-button"
                                    >
                                        <Brain className="w-4 h-4 mr-2" />
                                        View AI Suggestions
                                    </Button>
                                )}
                            </div>
                        )}
                    </WorkflowStep>
                </div>
            )}

            {/* AI Suggestions Panel */}
            {showSuggestions && schedulingResults && (
                <AISuggestions 
                    scheduleId={scheduleId}
                    onSuggestionApplied={handleSuggestionApplied}
                />
            )}
        </div>
    );
}
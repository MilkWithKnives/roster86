import { useState, useEffect } from 'react';
import {
    Brain,
    Clock,
    Users,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    Lightbulb,
    TrendingUp,
    Star,
    ThumbsUp,
    ThumbsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/contexts/WebSocketContext";
import apiClient from "@/api/apiClient";

const SuggestionTypeIcon = ({ type }) => {
    const iconMap = {
        overtime: Clock,
        shift_swap: Users,
        hire_temporary: Users,
        adjust_coverage: TrendingUp,
        split_shift: ArrowRight
    };
    const Icon = iconMap[type] || Lightbulb;
    return <Icon className="w-5 h-5" />;
};

const DifficultyBadge = ({ difficulty }) => {
    const colors = {
        'Easy': 'bg-green-100 text-green-800 border-green-200',
        'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Hard': 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
        <Badge className={`${colors[difficulty] || colors.Medium} text-xs font-medium`}>
            {difficulty}
        </Badge>
    );
};

const ConfidenceMeter = ({ confidence }) => {
    const getColor = (conf) => {
        if (conf >= 80) return 'bg-green-500';
        if (conf >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gray-400" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                    className={`h-2 rounded-full ${getColor(confidence)}`}
                    style={{ width: `${confidence}%` }}
                ></div>
            </div>
            <span className="text-sm text-gray-600">{confidence}%</span>
        </div>
    );
};

const SuggestionCard = ({ suggestion, gapDetails, onApply, onFeedback }) => {
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await onApply(suggestion.id, `Applied: ${suggestion.title}`);
            setIsApplied(true);
        } catch (error) {
            console.error('Failed to apply suggestion:', error);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <Card className="premium-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <SuggestionTypeIcon type={suggestion.type} />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                {suggestion.title}
                            </CardTitle>
                            <p className="text-sm text-gray-500 capitalize">
                                {suggestion.type.replace('_', ' ')} solution
                            </p>
                        </div>
                    </div>
                    <DifficultyBadge difficulty={suggestion.difficulty} />
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-gray-700 leading-relaxed">
                    {suggestion.description}
                </p>

                {/* Metrics Row */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Cost: ${suggestion.cost_impact?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>{suggestion.affected_employees?.length || 0} employees</span>
                    </div>
                </div>

                {/* Confidence */}
                <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-700">AI Confidence</span>
                    <ConfidenceMeter confidence={suggestion.confidence} />
                </div>

                {/* Risks */}
                {suggestion.risks && suggestion.risks.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Potential Risks</span>
                        <ul className="space-y-1">
                            {suggestion.risks.map((risk, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-orange-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    {risk}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Implementation Steps */}
                {suggestion.implementation_steps && suggestion.implementation_steps.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Implementation Steps</span>
                        <ol className="space-y-1">
                            {suggestion.implementation_steps.map((step, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium mt-0.5">
                                        {index + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onFeedback?.(suggestion.id, 'positive')}
                            className="text-green-600 hover:text-green-700"
                        >
                            <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onFeedback?.(suggestion.id, 'negative')}
                            className="text-red-600 hover:text-red-700"
                        >
                            <ThumbsDown className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    <Button
                        onClick={handleApply}
                        disabled={isApplying || isApplied}
                        className={`premium-button ${isApplied ? 'bg-green-600' : ''}`}
                    >
                        {isApplying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Applying...
                            </>
                        ) : isApplied ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Applied
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Apply Solution
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const GapOverview = ({ gap }) => (
    <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
            <div className="space-y-1">
                <p className="font-medium">
                    Coverage Gap: {gap.day} {gap.time_range}
                </p>
                <p className="text-sm">
                    Missing {gap.missing_staff} staff for {gap.required_role}
                    {gap.required_skill && ` (${gap.required_skill} required)`}
                </p>
                <p className="text-sm italic">
                    Reason: {gap.reason}
                </p>
            </div>
        </AlertDescription>
    </Alert>
);

export default function AISuggestions({ scheduleId, onSuggestionApplied }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isConnected } = useWebSocket();

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/suggestions/schedule/${scheduleId}`);
            if (response.data.success) {
                setSuggestions(response.data.data.suggestions);
            }
        } catch (err) {
            console.error('Failed to fetch AI suggestions:', err);
            setError(err.response?.data?.message || 'Failed to load AI suggestions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scheduleId) {
            fetchSuggestions();
        }
    }, [scheduleId]);

    // Listen for AI suggestions ready event
    useEffect(() => {
        const handleAISuggestionsReady = (event) => {
            if (event.detail.schedule_id === parseInt(scheduleId)) {
                console.log('🤖 AI suggestions ready for schedule:', scheduleId);
                fetchSuggestions();
            }
        };

        window.addEventListener('ai-suggestions-ready', handleAISuggestionsReady);
        return () => window.removeEventListener('ai-suggestions-ready', handleAISuggestionsReady);
    }, [scheduleId]);

    const handleApplySuggestion = async (suggestionId, notes) => {
        try {
            // Find the gap and suggestion
            const gapData = suggestions.find(s => 
                s.ai_suggestions.some(suggestion => suggestion.id === suggestionId)
            );
            
            if (!gapData) return;

            const response = await apiClient.post('/suggestions/apply', {
                schedule_id: parseInt(scheduleId),
                gap_id: gapData.gap_id,
                suggestion_id: suggestionId,
                implementation_notes: notes
            });

            if (response.data.success) {
                onSuggestionApplied?.(response.data.data);
                // Refresh suggestions
                await fetchSuggestions();
            }
        } catch (error) {
            console.error('Failed to apply suggestion:', error);
            throw error;
        }
    };

    const handleFeedback = async (suggestionId, type) => {
        // This could be implemented to collect user feedback
        console.log(`Feedback ${type} for suggestion ${suggestionId}`);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-semibold">AI Scheduling Suggestions</h2>
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <Card key={index} className="p-6">
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                    {error}
                </AlertDescription>
            </Alert>
        );
    }

    if (!suggestions || suggestions.length === 0) {
        return (
            <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                    No coverage gaps found - your schedule is fully covered!
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-semibold">AI Scheduling Suggestions</h2>
                    {isConnected && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Live Updates
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-gray-600">
                    {suggestions.length} coverage gap{suggestions.length !== 1 ? 's' : ''} found
                </p>
            </div>

            <div className="space-y-8">
                {suggestions.map((gapData) => (
                    <div key={gapData.gap_id} className="space-y-4">
                        <GapOverview gap={gapData} />
                        
                        {gapData.ai_suggestions && gapData.ai_suggestions.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2">
                                {gapData.ai_suggestions.map((suggestion) => (
                                    <SuggestionCard
                                        key={suggestion.id}
                                        suggestion={suggestion}
                                        gapDetails={gapData}
                                        onApply={handleApplySuggestion}
                                        onFeedback={handleFeedback}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Alert className="border-gray-200 bg-gray-50">
                                <Lightbulb className="h-4 w-4 text-gray-500" />
                                <AlertDescription className="text-gray-700">
                                    AI suggestions are being generated for this gap. Please wait...
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
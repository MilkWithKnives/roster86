const OpenAI = require('openai');
const database = require('../models/database');

/**
 * AI Service for Scheduling Suggestions
 * 
 * Uses OpenAI to analyze scheduling coverage gaps and provide
 * intelligent, actionable suggestions to managers
 */
class AIService {
    constructor() {
        this.openai = null;
        this.initialize();
    }

    initialize() {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY not set - AI suggestions disabled');
            return;
        }

        try {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            console.log('🤖 AI service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI service:', error);
        }
    }

    /**
     * Generate suggestions for scheduling coverage gaps
     */
    async generateSuggestions(scheduleId, coverageGaps, organizationId = 1) {
        if (!this.openai) {
            throw new Error('AI service not available - check OPENAI_API_KEY configuration');
        }

        try {
            console.log(`🤖 Generating AI suggestions for ${coverageGaps.length} coverage gaps`);

            // Gather context data
            const context = await this.gatherContextData(organizationId, coverageGaps);
            
            // Generate suggestions for each gap
            const allSuggestions = [];
            
            for (const gap of coverageGaps) {
                const suggestions = await this.analyzeCoverageGap(gap, context);
                allSuggestions.push({
                    gap_id: gap.shift_id,
                    gap_details: gap,
                    suggestions
                });
            }

            // Save suggestions to database
            await this.saveSuggestionsToDatabase(scheduleId, allSuggestions);

            console.log(`✅ Generated ${allSuggestions.length} AI suggestion sets`);
            return allSuggestions;

        } catch (error) {
            console.error('Error generating AI suggestions:', error);
            throw error;
        }
    }

    /**
     * Analyze a single coverage gap and generate specific suggestions
     */
    async analyzeCoverageGap(gap, context) {
        const prompt = this.buildAnalysisPrompt(gap, context);
        
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4", // Use GPT-4 for better reasoning
                messages: [
                    {
                        role: "system",
                        content: "You are an expert workforce scheduling consultant. Analyze scheduling gaps and provide practical, actionable solutions. Focus on cost-effective solutions that maintain fairness and compliance with labor laws."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.choices[0].message.content);
            
            // Validate and structure the response
            return this.structureSuggestions(result, gap);

        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            // Return fallback suggestions
            return this.generateFallbackSuggestions(gap);
        }
    }

    /**
     * Build comprehensive prompt for AI analysis
     */
    buildAnalysisPrompt(gap, context) {
        return `
SCHEDULING GAP ANALYSIS

**Coverage Gap Details:**
- Shift: ${gap.day} ${gap.time_range}
- Missing Staff: ${gap.missing_staff}
- Required Role: ${gap.required_role}
- Required Skill: ${gap.required_skill || 'None'}
- Eligible Workers Available: ${gap.eligible_workers}
- Gap Reason: ${gap.reason}

**Available Workforce:**
${context.availableEmployees.map(emp => 
    `- ${emp.name}: Skills [${emp.skills.join(', ')}], Available hours: ${emp.available_hours}/${emp.max_hours}, Rate: $${emp.hourly_rate}/hr`
).join('\n')}

**Current Week Schedule Context:**
- Total scheduled hours: ${context.totalScheduledHours}
- Average employee utilization: ${context.averageUtilization}%
- Budget remaining: $${context.budgetRemaining}

**Constraint Information:**
- Overtime allowed: ${context.allowOvertime ? 'Yes' : 'No'}
- Maximum shift length: 12 hours
- Minimum break between shifts: 8 hours

**TASK:** Analyze this coverage gap and provide 3-5 ranked suggestions to resolve it. For each suggestion, provide:
1. The specific action to take
2. Which employees would be affected
3. Estimated cost impact
4. Implementation difficulty (Easy/Medium/Hard)
5. Potential risks or drawbacks

Return your response as JSON in this exact format:
{
    "analysis": "Brief analysis of why this gap occurred",
    "suggestions": [
        {
            "id": 1,
            "title": "Suggestion title",
            "description": "Detailed description of the solution",
            "type": "overtime|shift_swap|hire_temporary|adjust_coverage|split_shift",
            "affected_employees": ["Employee names"],
            "cost_impact": 150.00,
            "difficulty": "Easy|Medium|Hard",
            "risks": ["Risk 1", "Risk 2"],
            "confidence": 85,
            "implementation_steps": ["Step 1", "Step 2"]
        }
    ]
}
`;
    }

    /**
     * Gather context data for AI analysis
     */
    async gatherContextData(organizationId, coverageGaps) {
        try {
            // Get available employees with their current schedules
            const employees = await database.all(`
                SELECT 
                    e.id,
                    u.full_name as name,
                    e.skills,
                    e.hourly_rate,
                    e.max_hours_per_week,
                    COALESCE(current_hours.hours, 0) as current_hours
                FROM employees e
                INNER JOIN users u ON e.user_id = u.id
                LEFT JOIN (
                    SELECT 
                        employee_id,
                        SUM(hours) as hours
                    FROM assignments a
                    INNER JOIN schedules s ON a.schedule_id = s.id
                    WHERE s.start_date >= date('now', '-7 days')
                    AND s.start_date <= date('now', '+7 days')
                    GROUP BY employee_id
                ) current_hours ON e.id = current_hours.employee_id
                WHERE u.organization_id = ? AND e.status = 'active'
            `, [organizationId]);

            // Calculate context metrics
            const totalScheduledHours = employees.reduce((sum, emp) => sum + (emp.current_hours || 0), 0);
            const totalAvailableHours = employees.reduce((sum, emp) => sum + emp.max_hours_per_week, 0);
            const averageUtilization = totalAvailableHours > 0 ? (totalScheduledHours / totalAvailableHours) * 100 : 0;

            // Estimate budget remaining (simplified calculation)
            const budgetUsed = employees.reduce((sum, emp) => sum + ((emp.current_hours || 0) * emp.hourly_rate), 0);
            const estimatedBudget = employees.reduce((sum, emp) => sum + (emp.max_hours_per_week * emp.hourly_rate), 0);

            return {
                availableEmployees: employees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    skills: emp.skills ? JSON.parse(emp.skills) : [],
                    hourly_rate: emp.hourly_rate,
                    max_hours: emp.max_hours_per_week,
                    current_hours: emp.current_hours || 0,
                    available_hours: Math.max(0, emp.max_hours_per_week - (emp.current_hours || 0))
                })),
                totalScheduledHours,
                averageUtilization: Math.round(averageUtilization),
                budgetRemaining: Math.max(0, estimatedBudget - budgetUsed),
                allowOvertime: false // This could be a setting
            };
        } catch (error) {
            console.error('Error gathering context data:', error);
            return {
                availableEmployees: [],
                totalScheduledHours: 0,
                averageUtilization: 0,
                budgetRemaining: 0,
                allowOvertime: false
            };
        }
    }

    /**
     * Structure and validate AI suggestions
     */
    structureSuggestions(aiResponse, gap) {
        const validTypes = ['overtime', 'shift_swap', 'hire_temporary', 'adjust_coverage', 'split_shift'];
        const validDifficulties = ['Easy', 'Medium', 'Hard'];

        if (!aiResponse.suggestions || !Array.isArray(aiResponse.suggestions)) {
            return this.generateFallbackSuggestions(gap);
        }

        return aiResponse.suggestions
            .filter(suggestion => suggestion.title && suggestion.description)
            .map((suggestion, index) => ({
                id: index + 1,
                title: suggestion.title.substring(0, 100), // Limit length
                description: suggestion.description.substring(0, 500),
                type: validTypes.includes(suggestion.type) ? suggestion.type : 'adjust_coverage',
                affected_employees: Array.isArray(suggestion.affected_employees) 
                    ? suggestion.affected_employees.slice(0, 5) 
                    : [],
                cost_impact: parseFloat(suggestion.cost_impact) || 0,
                difficulty: validDifficulties.includes(suggestion.difficulty) ? suggestion.difficulty : 'Medium',
                risks: Array.isArray(suggestion.risks) ? suggestion.risks.slice(0, 3) : [],
                confidence: Math.max(0, Math.min(100, parseInt(suggestion.confidence) || 50)),
                implementation_steps: Array.isArray(suggestion.implementation_steps) 
                    ? suggestion.implementation_steps.slice(0, 5) 
                    : [],
                analysis: aiResponse.analysis?.substring(0, 300) || "AI analysis not available"
            }))
            .slice(0, 5); // Limit to 5 suggestions max
    }

    /**
     * Generate fallback suggestions when AI fails
     */
    generateFallbackSuggestions(gap) {
        const suggestions = [];

        // Overtime suggestion
        if (gap.eligible_workers > 0) {
            suggestions.push({
                id: 1,
                title: "Offer Overtime to Existing Staff",
                description: `Ask available employees with required skills to work overtime for ${gap.time_range} on ${gap.day}.`,
                type: "overtime",
                affected_employees: [],
                cost_impact: gap.missing_staff * 8 * 22.5, // Estimated overtime rate
                difficulty: "Easy",
                risks: ["Increased labor costs", "Potential employee burnout"],
                confidence: 70,
                implementation_steps: [
                    "Identify employees with required skills",
                    "Contact employees for overtime availability",
                    "Confirm overtime rates and approval"
                ],
                analysis: "Standard overtime solution for immediate coverage needs"
            });
        }

        // Temporary staff suggestion
        suggestions.push({
            id: 2,
            title: "Hire Temporary Staff",
            description: `Bring in temporary workers for the ${gap.required_role} position during ${gap.time_range} on ${gap.day}.`,
            type: "hire_temporary",
            affected_employees: [],
            cost_impact: gap.missing_staff * 8 * 18, // Estimated temp rate
            difficulty: "Medium",
            risks: ["Higher costs", "Training time required", "Availability uncertainty"],
            confidence: 60,
            implementation_steps: [
                "Contact staffing agencies",
                "Screen temporary candidates",
                "Arrange necessary training"
            ],
            analysis: "External staffing solution when internal resources are insufficient"
        });

        return suggestions;
    }

    /**
     * Save suggestions to database
     */
    async saveSuggestionsToDatabase(scheduleId, allSuggestions) {
        try {
            for (const suggestionSet of allSuggestions) {
                // Update the scheduling_gaps table with AI suggestions
                await database.run(`
                    UPDATE scheduling_gaps 
                    SET ai_suggestions = ?
                    WHERE schedule_id = ? AND shift_id = ?
                `, [
                    JSON.stringify(suggestionSet.suggestions),
                    scheduleId,
                    suggestionSet.gap_id
                ]);
            }

            console.log(`💾 Saved AI suggestions for schedule ${scheduleId}`);
        } catch (error) {
            console.error('Error saving AI suggestions:', error);
        }
    }

    /**
     * Get suggestions for a specific schedule
     */
    async getSuggestionsForSchedule(scheduleId, organizationId) {
        try {
            const gaps = await database.all(`
                SELECT sg.*, s.name as schedule_name
                FROM scheduling_gaps sg
                INNER JOIN schedules s ON sg.schedule_id = s.id
                WHERE sg.schedule_id = ? AND s.organization_id = ?
                ORDER BY sg.day, sg.time_range
            `, [scheduleId, organizationId]);

            return gaps.map(gap => ({
                gap_id: gap.id,
                shift_id: gap.shift_id,
                day: gap.day,
                time_range: gap.time_range,
                missing_staff: gap.missing_staff,
                required_role: gap.required_role,
                required_skill: gap.required_skill,
                reason: gap.reason,
                ai_suggestions: gap.ai_suggestions ? JSON.parse(gap.ai_suggestions) : [],
                created_at: gap.created_at
            }));

        } catch (error) {
            console.error('Error getting suggestions for schedule:', error);
            throw error;
        }
    }

    /**
     * Test AI service connectivity
     */
    async testConnection() {
        if (!this.openai) {
            return { success: false, error: 'AI service not initialized' };
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello, respond with 'AI service working'" }],
                max_tokens: 10
            });

            return {
                success: true,
                message: response.choices[0].message.content,
                model: "gpt-3.5-turbo"
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AIService;
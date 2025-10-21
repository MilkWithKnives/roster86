const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const database = require('../models/database');
const AIService = require('./aiService');

/**
 * Scheduling Service
 * 
 * Manages execution of Python scheduling algorithm and results processing
 */
class SchedulingService {
    constructor(io) {
        this.io = io;
        this.activeJobs = new Map();
        this.resultsDirectory = path.join(__dirname, '..', 'temp', 'scheduling');
        this.ensureDirectoryExists();
    }

    async ensureDirectoryExists() {
        try {
            await fs.mkdir(this.resultsDirectory, { recursive: true });
        } catch (error) {
            console.error('Error creating scheduling results directory:', error);
        }
    }

    /**
     * Start a new scheduling job
     */
    async startSchedulingJob(organizationId, constraints = {}) {
        const jobId = uuidv4();
        
        try {
            // Emit initial progress
            this.emitProgress(jobId, {
                status: 'starting',
                message: 'Preparing scheduling data...',
                progress: 0
            });

            // Fetch data from database and convert to scheduling format
            const inputData = await this.prepareInputData(organizationId, constraints);
            
            // Save input file
            const inputFile = path.join(this.resultsDirectory, `input_${jobId}.json`);
            const outputFile = path.join(this.resultsDirectory, `output_${jobId}.json`);
            
            await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));

            // Start Python scheduling process
            const job = {
                id: jobId,
                organizationId,
                status: 'running',
                startTime: new Date(),
                inputFile,
                outputFile,
                constraints
            };

            this.activeJobs.set(jobId, job);

            this.emitProgress(jobId, {
                status: 'running',
                message: 'Executing scheduling algorithm...',
                progress: 25
            });

            // Execute Python script
            await this.runPythonScheduler(jobId, inputFile, outputFile);

            return { jobId, status: 'started' };

        } catch (error) {
            console.error('Error starting scheduling job:', error);
            
            this.emitProgress(jobId, {
                status: 'error',
                message: `Failed to start scheduling: ${error.message}`,
                progress: 0,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Execute the Python scheduling script
     */
    async runPythonScheduler(jobId, inputFile, outputFile) {
        return new Promise((resolve, reject) => {
            // Use new restaurant scheduling engine if available, fall back to old one
            const useAdvancedEngine = process.env.USE_ADVANCED_SCHEDULER !== 'false'; // Default to true
            const pythonScript = useAdvancedEngine
                ? path.join(__dirname, '..', 'restaurant_scheduling_runner.py')
                : path.join(__dirname, '..', 'scheduling_runner.py');

            console.log(`🐍 Starting ${useAdvancedEngine ? 'ADVANCED' : 'BASIC'} Python scheduler for job ${jobId}`);
            if (useAdvancedEngine) {
                console.log(`🎯 Using OptaPlanner-inspired algorithms (Tabu Search + CP-SAT)`);
            }
            console.log(`📄 Input: ${inputFile}`);
            console.log(`📄 Output: ${outputFile}`);

            const pythonProcess = spawn('python3', [pythonScript, inputFile, outputFile], {
                cwd: path.join(__dirname, '..'),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                console.log(`🐍 Python stdout: ${data.toString().trim()}`);
                
                // Emit intermediate progress if needed
                this.emitProgress(jobId, {
                    status: 'running',
                    message: 'Processing scheduling constraints...',
                    progress: 50
                });
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error(`🐍 Python stderr: ${data.toString().trim()}`);
            });

            pythonProcess.on('close', async (code) => {
                console.log(`🐍 Python process exited with code ${code}`);
                
                try {
                    // Parse results
                    const results = await this.processSchedulingResults(jobId, outputFile);
                    
                    if (code === 0 && results) {
                        this.emitProgress(jobId, {
                            status: 'completed',
                            message: 'Scheduling completed successfully!',
                            progress: 100,
                            results
                        });

                        // Save results to database
                        await this.saveSchedulingResults(jobId, results);
                        
                        resolve(results);
                    } else {
                        throw new Error(`Python process failed with code ${code}: ${stderr}`);
                    }
                } catch (error) {
                    console.error('Error processing scheduling results:', error);
                    
                    this.emitProgress(jobId, {
                        status: 'error',
                        message: `Scheduling failed: ${error.message}`,
                        progress: 100,
                        error: error.message
                    });

                    reject(error);
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Error spawning Python process:', error);

                // Provide actionable error messages
                let userMessage = `Failed to execute scheduling: ${error.message}`;

                if (error.code === 'ENOENT') {
                    userMessage = 'Python3 not found. Please install Python 3.11+ or check PATH.';
                } else if (error.message.includes('permission')) {
                    userMessage = 'Permission denied. Try: chmod +x backend/restaurant_scheduling_runner.py';
                }

                this.emitProgress(jobId, {
                    status: 'error',
                    message: userMessage,
                    progress: 0,
                    error: error.message,
                    troubleshooting: {
                        pythonPath: 'Ensure python3 is installed: python3 --version',
                        scriptPath: pythonScript,
                        suggestion: 'Run: cd backend && ./install_and_test.sh'
                    }
                });

                reject(new Error(userMessage));
            });
        });
    }

    /**
     * Prepare input data for Python scheduler from database
     */
    async prepareInputData(organizationId, constraints = {}) {
        try {
            // Fetch employees with their availability and skills
            const employees = await database.all(`
                SELECT 
                    e.id,
                    u.full_name,
                    e.skills,
                    e.availability,
                    e.hourly_rate,
                    e.max_hours_per_week,
                    e.min_hours_per_week
                FROM employees e
                INNER JOIN users u ON e.user_id = u.id
                WHERE u.organization_id = ? AND e.status = 'active'
            `, [organizationId]);

            // Fetch shift templates
            const shiftTemplates = await database.all(`
                SELECT *
                FROM shift_templates
                WHERE organization_id = ?
            `, [organizationId]);

            // Convert employees to scheduling format
            const workers = employees.map(emp => {
                const skills = emp.skills ? JSON.parse(emp.skills) : [];
                const availability = emp.availability ? JSON.parse(emp.availability) : [];
                
                return {
                    id: `EMP_${emp.id}`,
                    skills,
                    hourly_rate: emp.hourly_rate || 15.0,
                    max_hours: emp.max_hours_per_week || 40.0,
                    min_hours: emp.min_hours_per_week || 0.0,
                    availability: availability.map(slot => ({
                        day: slot.day,
                        start_time: slot.start_time,
                        end_time: slot.end_time
                    }))
                };
            });

            // Convert shift templates to scheduling format
            const shifts = shiftTemplates.map(template => ({
                id: `SHIFT_${template.id}`,
                day: template.day_of_week,
                start_time: template.start_time,
                end_time: template.end_time,
                requirements: [{
                    role: template.role || 'General',
                    count: template.required_staff || 1,
                    required_skill: template.required_skill || null
                }]
            }));

            // Apply budget constraints (NEW for advanced scheduler)
            const budget = constraints.budget || {
                max_total_cost: constraints.max_weekly_budget || 8000,
                max_daily_cost: constraints.max_daily_budget || null,
                target_cost: constraints.target_cost || null
            };

            // Apply fairness constraints (NEW for advanced scheduler)
            const fairness = constraints.fairness || {
                max_consecutive_days: constraints.max_consecutive_days || 6,
                min_rest_hours: constraints.min_rest_hours || 12,
                max_shift_imbalance: constraints.max_shift_imbalance || 4
            };

            // Apply any additional constraints
            const inputData = {
                workers,
                shifts,
                budget,         // NEW: Budget constraints
                fairness,       // NEW: Fairness constraints
                constraints: {
                    time_limit: constraints.time_limit || 60,
                    prefer_fairness: constraints.prefer_fairness !== undefined ? constraints.prefer_fairness : true,
                    allow_overtime: constraints.allow_overtime || false,
                    ...constraints
                }
            };

            console.log(`📊 Prepared scheduling data: ${workers.length} workers, ${shifts.length} shifts`);
            console.log(`💰 Budget: $${budget.max_total_cost} weekly${budget.max_daily_cost ? `, $${budget.max_daily_cost} daily` : ''}`);
            console.log(`⚖️  Fairness: ${fairness.max_consecutive_days} max days, ${fairness.min_rest_hours}h min rest`);
            return inputData;

        } catch (error) {
            console.error('Error preparing input data:', error);
            throw error;
        }
    }

    /**
     * Process scheduling results from Python output
     */
    async processSchedulingResults(jobId, outputFile) {
        try {
            const rawResults = await fs.readFile(outputFile, 'utf8');
            const results = JSON.parse(rawResults);

            // Update job status
            const job = this.activeJobs.get(jobId);
            if (job) {
                job.status = results.success ? 'completed' : 'failed';
                job.endTime = new Date();
                job.results = results;
            }

            console.log(`📊 Scheduling results processed for job ${jobId}`);
            console.log(`✅ Success: ${results.success}`);
            console.log(`📋 Assignments: ${results.solution?.assignments?.length || 0}`);
            console.log(`⚠️ Coverage gaps: ${results.coverage_gaps?.length || 0}`);

            return results;

        } catch (error) {
            console.error('Error processing scheduling results:', error);
            throw error;
        }
    }

    /**
     * Save scheduling results to database
     */
    async saveSchedulingResults(jobId, results) {
        try {
            const job = this.activeJobs.get(jobId);
            if (!job) return;

            // Create a new schedule record
            const scheduleResult = await database.run(`
                INSERT INTO schedules (
                    organization_id,
                    name,
                    start_date,
                    end_date,
                    status,
                    total_hours,
                    coverage_percentage,
                    fairness_score,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                job.organizationId,
                `Auto-Generated Schedule ${new Date().toISOString().split('T')[0]}`,
                this.getCurrentWeekStart(),
                this.getCurrentWeekEnd(),
                results.success ? 'draft' : 'failed',
                results.solution?.statistics?.total_hours || 0,
                this.calculateCoveragePercentage(results),
                results.solution?.statistics?.fairness_score || 0,
                1 // System user
            ]);

            const scheduleId = scheduleResult.id;

            // Save individual assignments if successful
            if (results.success && results.solution?.assignments) {
                for (const assignment of results.solution.assignments) {
                    const employeeId = assignment.worker_id.replace('EMP_', '');
                    const shiftTemplateId = assignment.shift_id.replace('SHIFT_', '');

                    await database.run(`
                        INSERT INTO assignments (
                            schedule_id,
                            employee_id,
                            shift_template_id,
                            date,
                            status,
                            hours
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        scheduleId,
                        employeeId,
                        shiftTemplateId,
                        this.getDateForDay(assignment.day),
                        'assigned',
                        assignment.duration_hours
                    ]);
                }
            }

            // Save coverage gaps for AI suggestion generation
            if (results.coverage_gaps && results.coverage_gaps.length > 0) {
                await this.saveCoverageGaps(scheduleId, results.coverage_gaps);
                
                // Automatically trigger AI suggestions for coverage gaps
                try {
                    console.log(`🤖 Triggering AI suggestions for ${results.coverage_gaps.length} coverage gaps`);
                    const aiService = new AIService();
                    await aiService.generateSuggestions(scheduleId, results.coverage_gaps, job.organizationId);
                    
                    // Emit AI suggestions generated event
                    this.io.to('scheduling').emit('ai-suggestions-ready', {
                        schedule_id: scheduleId,
                        gaps_count: results.coverage_gaps.length,
                        message: 'AI suggestions generated for coverage gaps',
                        timestamp: new Date().toISOString()
                    });
                } catch (aiError) {
                    console.warn('⚠️ Failed to generate AI suggestions:', aiError.message);
                    // Don't fail the entire scheduling process if AI suggestions fail
                }
            }

            console.log(`💾 Saved scheduling results to database: schedule ID ${scheduleId}`);

        } catch (error) {
            console.error('Error saving scheduling results:', error);
        }
    }

    /**
     * Save coverage gaps for AI analysis
     */
    async saveCoverageGaps(scheduleId, coverageGaps) {
        try {
            // Create a table for coverage gaps if it doesn't exist
            await database.run(`
                CREATE TABLE IF NOT EXISTS scheduling_gaps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    schedule_id INTEGER,
                    shift_id TEXT,
                    day TEXT,
                    time_range TEXT,
                    missing_staff INTEGER,
                    required_role TEXT,
                    required_skill TEXT,
                    eligible_workers INTEGER,
                    reason TEXT,
                    ai_suggestions TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
                )
            `);

            // Insert coverage gaps
            for (const gap of coverageGaps) {
                await database.run(`
                    INSERT INTO scheduling_gaps (
                        schedule_id,
                        shift_id,
                        day,
                        time_range,
                        missing_staff,
                        required_role,
                        required_skill,
                        eligible_workers,
                        reason
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    scheduleId,
                    gap.shift_id,
                    gap.day,
                    gap.time_range,
                    gap.missing_staff,
                    gap.required_role,
                    gap.required_skill,
                    gap.eligible_workers,
                    gap.reason
                ]);
            }

            console.log(`💾 Saved ${coverageGaps.length} coverage gaps for AI analysis`);

        } catch (error) {
            console.error('Error saving coverage gaps:', error);
        }
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        return this.activeJobs.get(jobId) || null;
    }

    /**
     * Get job results
     */
    async getJobResults(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job || !job.results) {
            return null;
        }

        return job.results;
    }

    /**
     * Emit progress updates via WebSocket
     */
    emitProgress(jobId, progress) {
        this.io.to('scheduling').emit('scheduling-progress', {
            jobId,
            ...progress,
            timestamp: new Date().toISOString()
        });

        console.log(`📡 Emitted scheduling progress for job ${jobId}: ${progress.status}`);
    }

    /**
     * Helper methods
     */
    getCurrentWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
    }

    getCurrentWeekEnd() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + daysToAdd);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd.toISOString().split('T')[0];
    }

    getDateForDay(dayName) {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = daysOfWeek.indexOf(dayName);
        const today = new Date();
        const currentDay = today.getDay();
        
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        
        return targetDate.toISOString().split('T')[0];
    }

    calculateCoveragePercentage(results) {
        if (!results.solution?.assignments || !results.coverage_gaps) return 0;
        
        const totalRequiredShifts = results.solution.assignments.length + results.coverage_gaps.length;
        const coveredShifts = results.solution.assignments.length;
        
        return totalRequiredShifts > 0 ? Math.round((coveredShifts / totalRequiredShifts) * 100) : 100;
    }

    /**
     * Cleanup old job data
     */
    async cleanup() {
        const ONE_HOUR = 60 * 60 * 1000;
        const now = new Date();

        for (const [jobId, job] of this.activeJobs.entries()) {
            if (now - job.startTime > ONE_HOUR) {
                // Remove old temp files
                try {
                    await fs.unlink(job.inputFile);
                    await fs.unlink(job.outputFile);
                } catch (e) {
                    // Ignore file cleanup errors in production, log in development
                    if (process.env.NODE_ENV === 'development') {
                        console.debug('Cleanup error (ignored):', e.message);
                    }
                }

                this.activeJobs.delete(jobId);
                console.log(`🧹 Cleaned up old scheduling job: ${jobId}`);
            }
        }
    }
}

module.exports = SchedulingService;
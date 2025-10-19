const database = require('../models/database');

/**
 * Metrics Service for Real-time Dashboard
 * 
 * Calculates live scheduling metrics including:
 * - Coverage percentage
 * - Uncovered shifts
 * - Employee utilization
 * - Scheduling conflicts
 */
class MetricsService {
    constructor(io) {
        this.io = io;
    }

    /**
     * Calculate comprehensive scheduling metrics
     */
    async calculateMetrics(organizationId = 1) {
        try {
            const [
                coverageMetrics,
                employeeStats,
                shiftStats,
                recentActivity
            ] = await Promise.all([
                this.calculateCoverageMetrics(organizationId),
                this.calculateEmployeeStats(organizationId),
                this.calculateShiftStats(organizationId),
                this.getRecentActivity(organizationId)
            ]);

            const metrics = {
                timestamp: new Date().toISOString(),
                coverage: coverageMetrics,
                employees: employeeStats,
                shifts: shiftStats,
                activity: recentActivity
            };

            // Emit to dashboard room for real-time updates
            this.io.to('dashboard').emit('metrics-update', metrics);

            return metrics;
        } catch (error) {
            console.error('Error calculating metrics:', error);
            throw error;
        }
    }

    /**
     * Calculate shift coverage metrics
     */
    async calculateCoverageMetrics(organizationId) {
        // Get total shift requirements for current week
        const currentWeekStart = this.getCurrentWeekStart();
        const currentWeekEnd = this.getCurrentWeekEnd();

        const totalShifts = await database.get(`
            SELECT COUNT(*) as count
            FROM shift_templates st
            WHERE st.organization_id = ?
        `, [organizationId]);

        // Get covered shifts (those with assignments)
        const coveredShifts = await database.get(`
            SELECT COUNT(DISTINCT st.id) as count
            FROM shift_templates st
            INNER JOIN assignments a ON st.id = a.shift_template_id
            INNER JOIN schedules s ON a.schedule_id = s.id
            WHERE st.organization_id = ? 
            AND s.start_date >= ? AND s.start_date <= ?
            AND a.status = 'assigned'
        `, [organizationId, currentWeekStart, currentWeekEnd]);

        // Get uncovered shifts with details
        const uncoveredShifts = await database.all(`
            SELECT 
                st.name,
                st.start_time,
                st.end_time,
                st.day_of_week,
                st.required_staff,
                COALESCE(assigned_count.count, 0) as assigned_count,
                (st.required_staff - COALESCE(assigned_count.count, 0)) as gap
            FROM shift_templates st
            LEFT JOIN (
                SELECT 
                    shift_template_id,
                    COUNT(*) as count
                FROM assignments a
                INNER JOIN schedules s ON a.schedule_id = s.id
                WHERE s.start_date >= ? AND s.start_date <= ?
                AND a.status = 'assigned'
                GROUP BY shift_template_id
            ) assigned_count ON st.id = assigned_count.shift_template_id
            WHERE st.organization_id = ?
            AND (st.required_staff - COALESCE(assigned_count.count, 0)) > 0
            ORDER BY st.day_of_week, st.start_time
        `, [currentWeekStart, currentWeekEnd, organizationId]);

        const coveragePercentage = totalShifts.count > 0 
            ? Math.round((coveredShifts.count / totalShifts.count) * 100)
            : 0;

        return {
            totalShifts: totalShifts.count,
            coveredShifts: coveredShifts.count,
            coveragePercentage,
            uncoveredShifts: uncoveredShifts,
            uncoveredCount: uncoveredShifts.length
        };
    }

    /**
     * Calculate employee utilization statistics
     */
    async calculateEmployeeStats(organizationId) {
        const currentWeekStart = this.getCurrentWeekStart();
        const currentWeekEnd = this.getCurrentWeekEnd();

        // Total active employees
        const totalEmployees = await database.get(`
            SELECT COUNT(*) as count
            FROM employees e
            INNER JOIN users u ON e.user_id = u.id
            WHERE u.organization_id = ? AND e.status = 'active'
        `, [organizationId]);

        // Employee utilization
        const utilization = await database.all(`
            SELECT 
                e.id,
                u.full_name,
                COUNT(a.id) as shifts_assigned,
                SUM(
                    CASE 
                        WHEN st.end_time > st.start_time THEN
                            (strftime('%H', st.end_time) - strftime('%H', st.start_time)) +
                            (strftime('%M', st.end_time) - strftime('%M', st.start_time)) / 60.0
                        ELSE
                            (24 - strftime('%H', st.start_time) + strftime('%H', st.end_time)) +
                            (strftime('%M', st.end_time) - strftime('%M', st.start_time)) / 60.0
                    END
                ) as total_hours
            FROM employees e
            INNER JOIN users u ON e.user_id = u.id
            LEFT JOIN assignments a ON e.id = a.employee_id
            LEFT JOIN schedules s ON a.schedule_id = s.id
            LEFT JOIN shift_templates st ON a.shift_template_id = st.id
            WHERE u.organization_id = ?
            AND e.status = 'active'
            AND s.start_date >= ? AND s.start_date <= ?
            AND a.status = 'assigned'
            GROUP BY e.id, u.full_name
            ORDER BY total_hours DESC
        `, [organizationId, currentWeekStart, currentWeekEnd]);

        const averageHours = utilization.length > 0
            ? utilization.reduce((sum, emp) => sum + (emp.total_hours || 0), 0) / utilization.length
            : 0;

        return {
            totalEmployees: totalEmployees.count,
            utilization,
            averageHours: Math.round(averageHours * 100) / 100
        };
    }

    /**
     * Calculate shift template statistics
     */
    async calculateShiftStats(organizationId) {
        const shiftTemplates = await database.get(`
            SELECT COUNT(*) as count
            FROM shift_templates
            WHERE organization_id = ?
        `, [organizationId]);

        const activeSchedules = await database.get(`
            SELECT COUNT(*) as count
            FROM schedules
            WHERE organization_id = ? AND status IN ('draft', 'published', 'active')
        `, [organizationId]);

        // Calculate total weekly hours across all shift templates
        const weeklyHours = await database.get(`
            SELECT SUM(
                CASE 
                    WHEN end_time > start_time THEN
                        (strftime('%H', end_time) - strftime('%H', start_time)) +
                        (strftime('%M', end_time) - strftime('%M', start_time)) / 60.0
                    ELSE
                        (24 - strftime('%H', start_time) + strftime('%H', end_time)) +
                        (strftime('%M', end_time) - strftime('%M', start_time)) / 60.0
                END * required_staff
            ) as total_hours
            FROM shift_templates
            WHERE organization_id = ?
        `, [organizationId]);

        return {
            totalShiftTemplates: shiftTemplates.count,
            activeSchedules: activeSchedules.count,
            weeklyHours: Math.round((weeklyHours.total_hours || 0) * 100) / 100
        };
    }

    /**
     * Get recent scheduling activity
     */
    async getRecentActivity(organizationId) {
        const activities = await database.all(`
            SELECT 
                'schedule_created' as type,
                s.name as description,
                s.created_at as timestamp,
                u.full_name as user_name
            FROM schedules s
            INNER JOIN users u ON s.created_by = u.id
            WHERE s.organization_id = ?
            
            UNION ALL
            
            SELECT 
                'assignment_updated' as type,
                'Assignment updated for ' || u.full_name as description,
                a.updated_at as timestamp,
                '' as user_name
            FROM assignments a
            INNER JOIN employees e ON a.employee_id = e.id
            INNER JOIN users u ON e.user_id = u.id
            WHERE u.organization_id = ?
            AND a.updated_at > datetime('now', '-24 hours')
            
            ORDER BY timestamp DESC
            LIMIT 10
        `, [organizationId, organizationId]);

        return activities;
    }

    /**
     * Emit specific coverage alerts
     */
    async emitCoverageAlert(organizationId, alert) {
        const alertData = {
            timestamp: new Date().toISOString(),
            type: 'coverage_alert',
            organizationId,
            ...alert
        };

        this.io.to('dashboard').emit('coverage-alert', alertData);
        console.log('📢 Coverage alert emitted:', alertData);
    }

    /**
     * Emit scheduling progress updates
     */
    async emitSchedulingProgress(organizationId, progress) {
        const progressData = {
            timestamp: new Date().toISOString(),
            organizationId,
            ...progress
        };

        this.io.to('scheduling').emit('scheduling-progress', progressData);
        console.log('⚙️ Scheduling progress emitted:', progressData);
    }

    /**
     * Helper methods for date calculations
     */
    getCurrentWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Make Monday the start
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
    }

    getCurrentWeekEnd() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; // Make Sunday the end
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + daysToAdd);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd.toISOString().split('T')[0];
    }
}

module.exports = MetricsService;
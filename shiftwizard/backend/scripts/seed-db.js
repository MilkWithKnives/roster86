const bcrypt = require('bcryptjs');
const database = require('../models/database');

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with sample data...');

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 12);
        await database.run(
            'INSERT OR IGNORE INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)', ['admin@roster86.com', adminPassword, 'Admin User', 'admin']
        );

        // Create manager user
        const managerPassword = await bcrypt.hash('manager123', 12);
        await database.run(
            'INSERT OR IGNORE INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)', ['manager@roster86.com', managerPassword, 'Manager User', 'manager']
        );

        // Create sample employees
        const employees = [{
                employee_id: 'EMP001',
                full_name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '555-0101',
                department: 'Operations',
                position: 'Shift Supervisor',
                hire_date: '2024-01-15',
                hourly_rate: 25.00,
                max_hours_per_week: 40,
                availability: JSON.stringify({
                    monday: { available: true, start: '09:00', end: '17:00' },
                    tuesday: { available: true, start: '09:00', end: '17:00' },
                    wednesday: { available: true, start: '09:00', end: '17:00' },
                    thursday: { available: true, start: '09:00', end: '17:00' },
                    friday: { available: true, start: '09:00', end: '17:00' },
                    saturday: { available: false },
                    sunday: { available: false }
                }),
                skills: JSON.stringify(['leadership', 'operations', 'customer_service']),
                status: 'active'
            },
            {
                employee_id: 'EMP002',
                full_name: 'Jane Smith',
                email: 'jane.smith@example.com',
                phone: '555-0102',
                department: 'Customer Service',
                position: 'Customer Service Rep',
                hire_date: '2024-02-01',
                hourly_rate: 18.50,
                max_hours_per_week: 35,
                availability: JSON.stringify({
                    monday: { available: true, start: '10:00', end: '18:00' },
                    tuesday: { available: true, start: '10:00', end: '18:00' },
                    wednesday: { available: true, start: '10:00', end: '18:00' },
                    thursday: { available: true, start: '10:00', end: '18:00' },
                    friday: { available: true, start: '10:00', end: '18:00' },
                    saturday: { available: true, start: '12:00', end: '17:00' },
                    sunday: { available: false }
                }),
                skills: JSON.stringify(['customer_service', 'communication', 'problem_solving']),
                status: 'active'
            },
            {
                employee_id: 'EMP003',
                full_name: 'Mike Johnson',
                email: 'mike.johnson@example.com',
                phone: '555-0103',
                department: 'Operations',
                position: 'Technician',
                hire_date: '2024-03-01',
                hourly_rate: 22.00,
                max_hours_per_week: 40,
                availability: JSON.stringify({
                    monday: { available: true, start: '08:00', end: '16:00' },
                    tuesday: { available: true, start: '08:00', end: '16:00' },
                    wednesday: { available: true, start: '08:00', end: '16:00' },
                    thursday: { available: true, start: '08:00', end: '16:00' },
                    friday: { available: true, start: '08:00', end: '16:00' },
                    saturday: { available: true, start: '10:00', end: '14:00' },
                    sunday: { available: false }
                }),
                skills: JSON.stringify(['technical', 'maintenance', 'troubleshooting']),
                status: 'active'
            }
        ];

        for (const emp of employees) {
            await database.run(
                `INSERT OR IGNORE INTO employees (
          employee_id, full_name, email, phone, department, position,
          hire_date, hourly_rate, max_hours_per_week, availability,
          skills, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    emp.employee_id, emp.full_name, emp.email, emp.phone,
                    emp.department, emp.position, emp.hire_date, emp.hourly_rate,
                    emp.max_hours_per_week, emp.availability, emp.skills, emp.status
                ]
            );
        }

        // Create sample shift templates
        const shiftTemplates = [{
                name: 'Morning Shift',
                description: 'Standard morning shift',
                start_time: '08:00',
                end_time: '16:00',
                break_duration: 60,
                required_skills: JSON.stringify(['customer_service']),
                min_employees: 2,
                max_employees: 4,
                department: 'Customer Service',
                color: '#3B82F6'
            },
            {
                name: 'Afternoon Shift',
                description: 'Standard afternoon shift',
                start_time: '16:00',
                end_time: '00:00',
                break_duration: 60,
                required_skills: JSON.stringify(['customer_service']),
                min_employees: 1,
                max_employees: 3,
                department: 'Customer Service',
                color: '#10B981'
            },
            {
                name: 'Operations Day',
                description: 'Operations day shift',
                start_time: '09:00',
                end_time: '17:00',
                break_duration: 60,
                required_skills: JSON.stringify(['operations', 'technical']),
                min_employees: 2,
                max_employees: 5,
                department: 'Operations',
                color: '#F59E0B'
            }
        ];

        for (const template of shiftTemplates) {
            await database.run(
                `INSERT OR IGNORE INTO shift_templates (
          name, description, start_time, end_time, break_duration,
          required_skills, min_employees, max_employees, department, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    template.name, template.description, template.start_time,
                    template.end_time, template.break_duration, template.required_skills,
                    template.min_employees, template.max_employees, template.department,
                    template.color
                ]
            );
        }

        // Create a sample schedule
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const weekAfter = new Date(nextWeek);
        weekAfter.setDate(weekAfter.getDate() + 6);

        await database.run(
            'INSERT OR IGNORE INTO schedules (name, start_date, end_date, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', [
                'Weekly Schedule - ' + nextWeek.toISOString().split('T')[0],
                nextWeek.toISOString().split('T')[0],
                weekAfter.toISOString().split('T')[0],
                'Sample weekly schedule',
                'draft',
                1 // admin user ID
            ]
        );

        console.log('✅ Database seeded successfully!');
        console.log('👤 Admin User: admin@roster86.com / admin123');
        console.log('👤 Manager User: manager@roster86.com / manager123');
        console.log('👥 Sample employees, shift templates, and schedule created');

    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase().then(() => {
        process.exit(0);
    });
}

module.exports = seedDatabase;
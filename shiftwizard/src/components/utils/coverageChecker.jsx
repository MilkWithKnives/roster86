const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ALL_ROLES = ["Manager", "Cashier", "Cook", "Server", "Bar", "Kitchen"];
const FOH_ROLES = ["Manager", "Cashier", "Server"];
const BOH_ROLES = ["Cook", "Kitchen", "Bar"];

// Helper to convert HH:MM to minutes from midnight
const timeToMinutes = (time) => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const runCoverageCheck = (templates) => {
  const results = [];
  const problematicTemplateIds = new Set();

  if (!templates || templates.length === 0) {
    results.push({ type: 'error', message: 'No active shift templates to analyze.' });
    return { results, problematicTemplateIds };
  }

  // 1. Group templates and check for bad config (min > max)
  const templatesByDayAndRole = {};
  DAYS_OF_WEEK.forEach(day => {
    templatesByDayAndRole[day] = {};
    ALL_ROLES.forEach(role => { templatesByDayAndRole[day][role] = []; });
  });

  for (const template of templates) {
    if (template.min_staff > template.max_staff) {
      results.push({ type: 'error', message: `Config error in "${template.name}": Min staff > Max staff.` });
      problematicTemplateIds.add(template.id);
    }
    if (templatesByDayAndRole[template.day] && templatesByDayAndRole[template.day][template.role]) {
      templatesByDayAndRole[template.day][template.role].push(template);
    }
  }

  // 2. Check for overlaps
  for (const day of DAYS_OF_WEEK) {
    for (const role of ALL_ROLES) {
      const roleShifts = templatesByDayAndRole[day][role];
      if (roleShifts.length > 1) {
        roleShifts.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        for (let i = 0; i < roleShifts.length - 1; i++) {
          const currentShift = roleShifts[i];
          const nextShift = roleShifts[i + 1];
          if (timeToMinutes(currentShift.end_time) > timeToMinutes(nextShift.start_time)) {
            results.push({
              type: 'warning',
              message: `Overlap on ${day} for ${role}: "${currentShift.name}" and "${nextShift.name}".`
            });
            problematicTemplateIds.add(currentShift.id);
            problematicTemplateIds.add(nextShift.id);
          }
        }
      }
    }
  }
  
  // 3. Check for day and role coverage
  for (const day of DAYS_OF_WEEK) {
    const dayTemplates = templates.filter(t => t.day === day);
    if (dayTemplates.length === 0) {
      results.push({ type: 'warning', message: `${day}: No shifts defined.` });
    } else {
      // Check for at least one FOH and one BOH role
      const hasFOH = dayTemplates.some(t => FOH_ROLES.includes(t.role));
      const hasBOH = dayTemplates.some(t => BOH_ROLES.includes(t.role));

      if (hasFOH) {
        results.push({ type: 'success', message: `${day}: Front-of-House roles are covered.` });
      } else {
        results.push({ type: 'warning', message: `${day}: No Front-of-House shifts assigned.` });
      }

      if (hasBOH) {
        results.push({ type: 'success', message: `${day}: Back-of-House roles are covered.` });
      } else {
        results.push({ type: 'warning', message: `${day}: No Back-of-House shifts assigned.` });
      }
    }
  }

  // Sort results: error, warning, success
  results.sort((a, b) => {
    const order = { error: 0, warning: 1, success: 2 };
    return order[a.type] - order[b.type];
  });

  return { results, problematicTemplateIds };
};
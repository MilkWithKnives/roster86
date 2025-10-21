# Restaurant Scheduling Engine - Upgrade Guide

## Overview

Your roster86 application has been upgraded with **advanced OptaPlanner-inspired scheduling algorithms** specifically designed for restaurant workforce management.

### What's New

**New File:** `restaurant_scheduling_engine.py`

This enhanced scheduling engine implements:

1. **Advanced Algorithms (from OptaPlanner)**
   - **First Fit Decreasing** (Construction Heuristic) - Fast initial solution
   - **Tabu Search-inspired** refinement via CP-SAT local search
   - **Late Acceptance** backup strategy (deterministic fallback)

2. **Budget Constraints** (Critical for Restaurants!)
   - Total weekly budget caps
   - Daily budget limits
   - Target cost optimization

3. **Fairness & Balance**
   - Even shift distribution across workers
   - Maximum consecutive days limits
   - Minimum rest period between shifts
   - Shift count balancing

4. **Restaurant-Specific Features**
   - Shift types: Prep, Opening, Lunch, Dinner, Closing
   - Opening/closing duty tracking
   - Section assignments for servers
   - Role-based scheduling (Server, Cook, Host, Busser, Manager, etc.)

---

## Installation Steps

### Step 1: Install OR-Tools (Required Dependency)

The scheduling engine uses Google OR-Tools CP-SAT solver. Install it:

```bash
# Navigate to backend directory
cd /Users/papichulo/roster86/shiftwizard/backend

# Option A: Using pip with --user flag (recommended for macOS)
pip3 install --user ortools

# Option B: Using virtual environment (cleaner approach)
python3 -m venv venv
source venv/bin/activate
pip install ortools

# Option C: If Python 3.14 has issues, try Python 3.11
pyenv install 3.11.9
pyenv local 3.11.9
pip install ortools
```

### Step 2: Verify Installation

```bash
python3 -c "from ortools.sat.python import cp_model; print('OR-Tools installed successfully!')"
```

### Step 3: Test the New Engine

```bash
python3 restaurant_scheduling_engine.py
```

You should see output like:
```
================================================================================
RESTAURANT SCHEDULING ENGINE WITH ADVANCED METAHEURISTICS
OptaPlanner-inspired: First Fit Decreasing + Tabu Search + Budget Optimization
================================================================================

Creating sample restaurant scheduling problem...
  Workers: 15
  Shifts: 21
  Weekly budget: $8000.00
  Daily budget cap: $1200.00

Building optimization model...
Creating decision variables with First Fit Decreasing prioritization...
  Created XXX decision variables
  ...

✓ Schedule generated successfully!

RESTAURANT SCHEDULE (Optimized with Tabu Search-inspired CP-SAT)
================================================================================
Total Labor Cost: $7,XXX.XX
Budget: $8000.00 (Utilization: XX.X%)
...
```

---

## Integration with Roster86 API

### Current Architecture

Your existing system:
- **Frontend:** React/TypeScript (`/Users/papichulo/roster86/shiftwizard/src`)
- **Backend:** Node.js/Express (`/Users/papichulo/roster86/shiftwizard/backend`)
- **Database:** SQLite (`database.sqlite`)
- **Old Scheduler:** `workforce_scheduling_engine.py` + `scheduling_runner.py`

### Integration Options

#### Option 1: Update scheduling_runner.py (Recommended)

Modify `/Users/papichulo/roster86/shiftwizard/backend/scheduling_runner.py` to use the new engine:

```python
# At the top of scheduling_runner.py, change:
# OLD:
from workforce_scheduling_engine import (
    SchedulingInputData,
    SchedulerModel,
    ...
)

# NEW:
from restaurant_scheduling_engine import (
    RestaurantSchedulingData,
    RestaurantSchedulerModel,
    RestaurantShift,
    ShiftType,
    ...
)

# Update the SchedulingRunner class to use RestaurantSchedulingData
# and RestaurantSchedulerModel instead of the old classes
```

#### Option 2: Create New API Endpoint

Create a new endpoint specifically for advanced scheduling:

```javascript
// In your backend routes (e.g., routes/scheduling.js)

const { spawn } = require('child_process');

router.post('/api/schedule/advanced', async (req, res) => {
  const { workers, shifts, budget, fairness } = req.body;

  // Create input JSON for Python scheduler
  const inputData = {
    workers: workers,
    shifts: shifts,
    budget: budget || { max_total_cost: 10000 },
    fairness: fairness || {
      max_consecutive_days: 6,
      min_rest_hours: 12
    }
  };

  // Write to temp file
  const fs = require('fs');
  const inputPath = './temp_schedule_input.json';
  const outputPath = './temp_schedule_output.json';

  fs.writeFileSync(inputPath, JSON.stringify(inputData));

  // Call Python scheduler
  const python = spawn('python3', [
    'restaurant_scheduling_runner.py',  // You'll create this
    inputPath,
    outputPath
  ]);

  python.on('close', (code) => {
    if (code === 0) {
      const result = JSON.parse(fs.readFileSync(outputPath));
      res.json(result);
    } else {
      res.status(500).json({ error: 'Scheduling failed' });
    }
  });
});
```

#### Option 3: Direct Python Integration (Advanced)

Use a Python-to-JavaScript bridge like:
- **pynode** - Run Python directly from Node.js
- **python-shell** - npm package for Python execution

```javascript
const { PythonShell } = require('python-shell');

router.post('/api/schedule', async (req, res) => {
  const options = {
    mode: 'json',
    pythonPath: 'python3',
    scriptPath: './backend',
    args: [JSON.stringify(req.body)]
  };

  PythonShell.run('restaurant_scheduling_engine.py', options, (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});
```

---

## Configuration Guide

### Budget Constraints

```python
# In your scheduling code:
data.set_budget_constraint(
    max_total_cost=8000.00,   # Weekly budget cap (HARD constraint)
    max_daily_cost=1200.00,   # Daily budget cap (HARD constraint)
    target_cost=7500.00       # Target to aim for (SOFT goal)
)
```

**How it works:**
- Scheduler MUST stay under `max_total_cost` and `max_daily_cost`
- Will try to get close to `target_cost` while minimizing cost
- If budget is too tight, scheduling will fail → increase budget or reduce shift requirements

### Fairness Constraints

```python
data.set_fairness_constraints(
    max_shift_imbalance=4,     # Max difference in shift count between workers
    max_consecutive_days=5,    # No more than 5 consecutive working days
    min_rest_hours=12.0        # At least 12 hours rest between shifts
)
```

**How it works:**
- **max_shift_imbalance:** Prevents one worker from getting 10 shifts while another gets 2
- **max_consecutive_days:** Ensures work-life balance, prevents burnout
- **min_rest_hours:** Legal compliance, prevents clopening (close → open shifts)

### Restaurant-Specific Shifts

```python
# Define a dinner shift with closing duties
dinner_shift = RestaurantShift(
    shift_id="DINNER_FRI_001",
    day="Friday",
    start_time="16:00",
    end_time="23:00",
    shift_type=ShiftType.DINNER,
    section="Section_A",                # Optional: for servers
    requires_opening_duties=False,
    requires_closing_duties=True        # This shift includes closing tasks
)

# Add requirements
data.add_shift(dinner_shift, [
    ShiftRequirement("Server", 4, None),
    ShiftRequirement("Cook", 2, None),
    ShiftRequirement("Manager", 1, "Closing"),  # Must have Closing skill
])
```

---

## Comparison: Old vs New Engine

| Feature | Old Engine | New Engine |
|---------|-----------|------------|
| **Algorithm** | Basic CP-SAT | First Fit Decreasing + Tabu Search-inspired CP-SAT |
| **Budget Constraints** | ❌ No | ✅ Yes (total + daily caps) |
| **Fairness** | ❌ No | ✅ Yes (shift balancing, rest periods) |
| **Consecutive Days Limit** | ❌ No | ✅ Yes (configurable) |
| **Rest Between Shifts** | ❌ No | ✅ Yes (prevents clopening) |
| **Restaurant Roles** | Generic roles | ✅ Specialized (Server, Cook, Host, etc.) |
| **Shift Types** | Generic shifts | ✅ Typed (Prep, Lunch, Dinner, Closing) |
| **Opening/Closing Duties** | ❌ No | ✅ Yes (tracked separately) |
| **Section Assignments** | ❌ No | ✅ Yes (for servers) |
| **Multi-objective** | Cost only | ✅ Cost + Fairness + Budget targets |
| **Solution Quality** | Good | ✅ Better (metaheuristic refinement) |
| **Solve Time** | Fast | ✅ Configurable (more time = better quality) |

---

## Performance Tuning

### Time Limits

```python
# Faster but potentially lower quality
scheduler.solve_model(time_limit_seconds=10)

# Better quality (recommended for production)
scheduler.solve_model(time_limit_seconds=60)

# Highest quality (for complex schedules)
scheduler.solve_model(time_limit_seconds=300)  # 5 minutes
```

**Recommendation for Restaurants:**
- **Development/Testing:** 10-30 seconds
- **Production (weekly schedules):** 60-120 seconds
- **Complex constraints:** 180-300 seconds

### Scaling Guide

| Restaurant Size | Workers | Shifts/Week | Recommended Time Limit |
|-----------------|---------|-------------|----------------------|
| Small (café) | 5-10 | 20-40 | 10-30s |
| Medium (bistro) | 10-20 | 40-80 | 30-60s |
| Large (full-service) | 20-40 | 80-150 | 60-180s |
| Very Large (chain) | 40+ | 150+ | 180-600s |

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'ortools'"

**Solution:**
```bash
pip3 install --user ortools
# OR
python3 -m pip install ortools --break-system-packages  # macOS workaround
```

### Issue: "INFEASIBLE - No valid schedule exists"

**Possible causes:**
1. **Budget too tight** → Increase `max_total_cost`
2. **Not enough workers** → Add workers or increase availability
3. **Skill gaps** → Ensure workers have required skills
4. **Over-constrained fairness** → Relax `max_consecutive_days` or `min_rest_hours`

**Debug steps:**
```python
# Add before solving:
print(data.budget_constraint)
print(f"Total possible cost range: ${min_cost:.2f} - ${max_cost:.2f}")

# Check if budget is achievable
min_cost = sum(min(data.labor_cost.values()) * shift.duration_hours
               for shift in data.shifts)
```

### Issue: Schedule quality is poor

**Solution:** Increase solve time limit:
```python
scheduler.solve_model(time_limit_seconds=120)  # Was: 30
```

### Issue: Python 3.14 incompatibility

**Solution:** Use Python 3.11:
```bash
pyenv install 3.11.9
pyenv local 3.11.9
pip install ortools
python restaurant_scheduling_engine.py
```

---

## Example API Payload

### Input (from Frontend to Backend):

```json
{
  "workers": [
    {
      "id": "SERVER_001",
      "skills": ["Server", "Host"],
      "hourly_rate": 15.00,
      "max_hours": 40.0,
      "availability": [
        {"day": "Monday", "start_time": "10:00", "end_time": "23:00"},
        {"day": "Tuesday", "start_time": "10:00", "end_time": "23:00"}
      ]
    }
  ],
  "shifts": [
    {
      "id": "DINNER_MON_001",
      "day": "Monday",
      "start_time": "16:00",
      "end_time": "23:00",
      "shift_type": "Dinner",
      "requirements": [
        {"role": "Server", "count": 4, "required_skill": null}
      ]
    }
  ],
  "budget": {
    "max_total_cost": 8000.00,
    "max_daily_cost": 1200.00
  },
  "fairness": {
    "max_consecutive_days": 6,
    "min_rest_hours": 12.0
  }
}
```

### Output (from Scheduler):

```json
{
  "success": true,
  "solution": {
    "assignments": [
      {
        "worker_id": "SERVER_001",
        "shift_id": "DINNER_MON_001",
        "day": "Monday",
        "start_time": "16:00",
        "end_time": "23:00",
        "duration_hours": 7.0,
        "cost": 105.00
      }
    ],
    "total_cost": 7650.50,
    "budget_utilization": 95.6,
    "solve_time": 12.5,
    "statistics": {
      "num_workers_used": 12,
      "avg_hours_per_worker": 28.5,
      "max_shift_imbalance": 3
    }
  },
  "coverage_gaps": [],
  "messages": ["Schedule generated successfully!"]
}
```

---

## Next Steps

1. **Install OR-Tools** (see Step 1 above)
2. **Test the new engine** with sample data
3. **Choose integration option** (Option 1 recommended)
4. **Update frontend** to send budget/fairness constraints
5. **Deploy** and monitor performance

## Support

For algorithm questions or optimization help, refer to:
- OptaPlanner docs: https://docs.optaplanner.org/
- OR-Tools docs: https://developers.google.com/optimization
- This implementation: `/Users/papichulo/roster86/shiftwizard/backend/restaurant_scheduling_engine.py`

---

**Algorithm Summary:**

This implementation brings the **best of OptaPlanner** (Tabu Search + Late Acceptance metaheuristics) to your Python-based restaurant scheduling system, with restaurant-specific enhancements that the original OptaPlanner examples don't include (budget constraints, clopening prevention, section assignments).

You now have **enterprise-grade scheduling** optimized specifically for the restaurant industry. 🍽️

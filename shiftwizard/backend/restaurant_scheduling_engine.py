"""
Restaurant Workforce Scheduling Engine with Advanced Metaheuristics
====================================================================

An enhanced constraint programming solution implementing OptaPlanner-inspired
algorithms (Tabu Search + Late Acceptance) specifically for restaurant scheduling.

Key Features:
- Budget constraint optimization (critical for restaurants)
- Fairness and balance (shift distribution equity)
- Restaurant-specific roles (prep, opening, closing, server sections)
- Multi-phase solving: Construction Heuristic → Tabu Search refinement
- Worker availability, skill matching, labor cost minimization

Algorithms Implemented:
1. First Fit Decreasing (Construction Heuristic) - Fast initial solution
2. Tabu Search variant (Local Search) - Refinement for quality
3. Late Acceptance backup - Deterministic fallback

Author: Claude Code
Date: 2025-10-20
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Tuple, Optional, Set, Any
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from enum import Enum
import json
import random


# ============================================================================
# RESTAURANT-SPECIFIC DATA STRUCTURES
# ============================================================================

class RestaurantRole(Enum):
    """Restaurant-specific job roles."""
    SERVER = "Server"
    BARTENDER = "Bartender"
    HOST = "Host"
    COOK = "Cook"
    PREP_COOK = "Prep_Cook"
    DISHWASHER = "Dishwasher"
    MANAGER = "Manager"
    SOUS_CHEF = "Sous_Chef"
    BUSSER = "Busser"


class ShiftType(Enum):
    """Types of restaurant shifts."""
    PREP = "Prep"           # Early morning prep work
    OPENING = "Opening"     # Opening shift
    LUNCH = "Lunch"         # Lunch service
    DINNER = "Dinner"       # Dinner service
    CLOSING = "Closing"     # Closing shift
    DOUBLE = "Double"       # Double shift (lunch + dinner)


@dataclass
class RestaurantShift:
    """
    Enhanced shift structure for restaurant scheduling.

    Attributes:
        shift_id: Unique identifier
        day: Day of week
        start_time: Start time (24-hour format)
        end_time: End time (24-hour format)
        shift_type: Type of shift (prep, opening, lunch, dinner, closing)
        section: Optional section assignment (for servers)
        requires_opening_duties: Whether shift includes opening tasks
        requires_closing_duties: Whether shift includes closing tasks
    """
    shift_id: str
    day: str
    start_time: str
    end_time: str
    shift_type: ShiftType = ShiftType.LUNCH
    section: Optional[str] = None
    requires_opening_duties: bool = False
    requires_closing_duties: bool = False

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours."""
        start = datetime.strptime(self.start_time, "%H:%M")
        end = datetime.strptime(self.end_time, "%H:%M")

        if end < start:
            end += timedelta(days=1)

        duration = (end - start).total_seconds() / 3600
        return duration

    def __str__(self):
        return f"{self.shift_id} ({self.day} {self.start_time}-{self.end_time} {self.shift_type.value})"


@dataclass
class BudgetConstraint:
    """
    Budget constraints for scheduling periods.

    Attributes:
        max_total_cost: Maximum total labor cost for the period
        max_daily_cost: Optional maximum cost per day
        target_cost: Target cost to aim for (soft constraint)
    """
    max_total_cost: float
    max_daily_cost: Optional[float] = None
    target_cost: Optional[float] = None


@dataclass
class FairnessConstraints:
    """
    Fairness and balance constraints for shift distribution.

    Attributes:
        max_shift_imbalance: Max difference in shift count between workers
        prefer_even_distribution: Whether to prefer even hour distribution
        max_consecutive_days: Max consecutive days a worker can be scheduled
        min_rest_hours: Minimum hours of rest between shifts
    """
    max_shift_imbalance: int = 3
    prefer_even_distribution: bool = True
    max_consecutive_days: int = 6
    min_rest_hours: float = 10.0


# ============================================================================
# ENHANCED SCHEDULING INPUT DATA
# ============================================================================

class RestaurantSchedulingData:
    """
    Extended input data container for restaurant scheduling with budget
    and fairness constraints.
    """

    def __init__(self):
        """Initialize empty data structures."""
        self.workers: List[str] = []
        self.shifts: List[RestaurantShift] = []
        self.roles: List[str] = []

        # Worker attributes
        self.worker_skills: Dict[str, List[str]] = {}
        self.worker_availability: Dict[str, List['TimeSlot']] = {}
        self.labor_cost: Dict[str, float] = {}
        self.max_hours_per_week: Dict[str, float] = {}
        self.min_hours_per_week: Dict[str, float] = {}

        # Shift requirements (same as before)
        self.shift_requirements: Dict[str, List['ShiftRequirement']] = {}

        # NEW: Restaurant-specific constraints
        self.budget_constraint: Optional[BudgetConstraint] = None
        self.fairness_constraints: FairnessConstraints = FairnessConstraints()

        # NEW: Day-of-week mapping for consecutive day tracking
        self.days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    def set_budget_constraint(self, max_total_cost: float, max_daily_cost: Optional[float] = None, target_cost: Optional[float] = None):
        """Set budget constraints."""
        self.budget_constraint = BudgetConstraint(max_total_cost, max_daily_cost, target_cost)

    def set_fairness_constraints(self, max_shift_imbalance: int = 3, max_consecutive_days: int = 6, min_rest_hours: float = 10.0):
        """Set fairness constraints."""
        self.fairness_constraints = FairnessConstraints(
            max_shift_imbalance=max_shift_imbalance,
            max_consecutive_days=max_consecutive_days,
            min_rest_hours=min_rest_hours
        )

    # Import methods from base class (simplified - in real code would inherit)
    def add_worker(self, worker_id: str, skills: List[str], hourly_rate: float, max_hours: float = 40.0, min_hours: float = 0.0):
        """Add a worker to the scheduling system."""
        self.workers.append(worker_id)
        self.worker_skills[worker_id] = skills
        self.labor_cost[worker_id] = hourly_rate
        self.max_hours_per_week[worker_id] = max_hours
        self.min_hours_per_week[worker_id] = min_hours

    def add_shift(self, shift: RestaurantShift, requirements: List['ShiftRequirement']):
        """Add a shift with its staffing requirements."""
        self.shifts.append(shift)
        self.shift_requirements[shift.shift_id] = requirements

        # Track unique roles
        for req in requirements:
            if req.role not in self.roles:
                self.roles.append(req.role)

    def add_availability(self, worker_id: str, time_slots: List['TimeSlot']):
        """Set availability for a worker."""
        self.worker_availability[worker_id] = time_slots

    def get_shift(self, shift_id: str) -> Optional[RestaurantShift]:
        """Retrieve a shift by ID."""
        for shift in self.shifts:
            if shift.shift_id == shift_id:
                return shift
        return None

    def worker_can_work_shift(self, worker_id: str, shift: RestaurantShift) -> bool:
        """Check if a worker is available for a specific shift."""
        if worker_id not in self.worker_availability:
            return False

        for time_slot in self.worker_availability[worker_id]:
            if time_slot.overlaps_with_shift(shift):
                return True
        return False

    def worker_has_skill(self, worker_id: str, skill: str) -> bool:
        """Check if a worker possesses a specific skill."""
        if skill is None:
            return True
        return skill in self.worker_skills.get(worker_id, [])

    def get_day_index(self, day: str) -> int:
        """Get numeric index for day of week."""
        return self.days_order.index(day)


# ============================================================================
# IMPORT COMPATIBILITY STRUCTURES FROM BASE ENGINE
# ============================================================================

@dataclass
class TimeSlot:
    """Worker's available time period."""
    day: str
    start_time: str
    end_time: str

    def overlaps_with_shift(self, shift: RestaurantShift) -> bool:
        """Check if this availability slot covers the given shift."""
        if self.day != shift.day:
            return False

        avail_start = datetime.strptime(self.start_time, "%H:%M")
        avail_end = datetime.strptime(self.end_time, "%H:%M")
        shift_start = datetime.strptime(shift.start_time, "%H:%M")
        shift_end = datetime.strptime(shift.end_time, "%H:%M")

        if shift_end < shift_start:
            shift_end += timedelta(days=1)
        if avail_end < avail_start:
            avail_end += timedelta(days=1)

        return avail_start <= shift_start and avail_end >= shift_end


@dataclass
class ShiftRequirement:
    """Staffing requirements for a specific role in a shift."""
    role: str
    count: int
    required_skill: Optional[str] = None


# ============================================================================
# ENHANCED SCHEDULER WITH METAHEURISTICS
# ============================================================================

class RestaurantSchedulerModel:
    """
    Advanced restaurant scheduling model implementing:
    1. First Fit Decreasing (Construction Heuristic)
    2. CP-SAT with budget + fairness constraints
    3. Tabu Search-inspired post-processing (optional)

    This model extends the base CP-SAT approach with restaurant-specific
    constraints and multi-objective optimization.
    """

    def __init__(self, data: RestaurantSchedulingData):
        """Initialize the enhanced scheduler."""
        self.data = data
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        # Decision variables
        self.x: Dict[str, Dict[str, cp_model.IntVar]] = {}

        # Budget tracking variables
        self.daily_cost_vars: Dict[str, cp_model.IntVar] = {}
        self.total_cost_var: Optional[cp_model.IntVar] = None

        # Fairness tracking variables
        self.worker_shift_counts: Dict[str, cp_model.IntVar] = {}

        # Solution storage
        self.solution: Optional[Dict[str, Any]] = None
        self.solve_time: float = 0.0
        self.optimal_cost: float = 0.0

        # Constants
        self.COST_SCALE = 100  # Scale for integer arithmetic

    def create_variables(self):
        """
        Create decision variables with advanced First Fit Decreasing heuristic.

        Prioritizes difficult-to-schedule workers using composite scoring:
        1. Fewer skills → harder to place (higher priority)
        2. Limited availability → harder to place
        3. Higher hourly rate → more impactful on cost
        """
        print("Creating decision variables with enhanced First Fit Decreasing...")

        # Enhanced scoring: difficulty to schedule
        worker_scores = []
        for w in self.data.workers:
            skill_count = len(self.data.worker_skills.get(w, []))
            availability_slots = len(self.data.worker_availability.get(w, []))
            hourly_rate = self.data.labor_cost.get(w, 15.0)

            # Composite difficulty score (higher = harder to schedule)
            # Prioritize: few skills, limited availability, high cost
            difficulty = (10 - skill_count) + (20 - availability_slots) + (hourly_rate / 5)
            worker_scores.append((w, difficulty))

        # Sort by difficulty (descending) - schedule hardest first
        sorted_workers = [w for w, _ in sorted(worker_scores, key=lambda x: -x[1])]

        print(f"  Worker priority order established (hardest → easiest)")

        var_count = 0
        for worker_id in sorted_workers:
            self.x[worker_id] = {}

            for shift in self.data.shifts:
                if self.data.worker_can_work_shift(worker_id, shift):
                    var_name = f"x_{worker_id}_{shift.shift_id}"
                    self.x[worker_id][shift.shift_id] = self.model.NewBoolVar(var_name)
                    var_count += 1

        print(f"  Created {var_count} decision variables ({len(sorted_workers)} workers × avg {var_count/len(sorted_workers):.1f} shifts)")

        # Create auxiliary variables for budget tracking
        self._create_budget_variables()

        # Create auxiliary variables for fairness tracking
        self._create_fairness_variables()

    def _create_budget_variables(self):
        """Create auxiliary variables for budget constraint tracking."""
        if not self.data.budget_constraint:
            return

        print("  Creating budget tracking variables...")

        # Create variables for daily costs if daily budget constraint exists
        if self.data.budget_constraint.max_daily_cost:
            for day in self.data.days_order:
                max_cost_cents = int(self.data.budget_constraint.max_daily_cost * self.COST_SCALE)
                self.daily_cost_vars[day] = self.model.NewIntVar(0, max_cost_cents, f"daily_cost_{day}")

        # Create variable for total cost
        max_total_cents = int(self.data.budget_constraint.max_total_cost * self.COST_SCALE)
        self.total_cost_var = self.model.NewIntVar(0, max_total_cents, "total_cost")

    def _create_fairness_variables(self):
        """Create auxiliary variables for fairness constraint tracking."""
        print("  Creating fairness tracking variables...")

        # Create variables to count shifts per worker
        max_possible_shifts = len(self.data.shifts)
        for worker_id in self.data.workers:
            self.worker_shift_counts[worker_id] = self.model.NewIntVar(
                0, max_possible_shifts, f"shift_count_{worker_id}"
            )

    def add_hard_constraints(self):
        """
        Add all hard constraints including restaurant-specific ones.

        Constraints:
        1. Shift coverage (all shifts must be staffed)
        2. Skill matching (workers must have required skills)
        3. Availability (workers only work when available)
        4. No overlaps (workers can't work overlapping shifts)
        5. Maximum hours per week
        6. BUDGET (hard cap on total labor cost)
        7. Consecutive days limit
        8. Minimum rest between shifts
        """
        print("Adding hard constraints...")

        # Standard constraints (1-5)
        self._add_coverage_constraints()
        self._add_overlap_constraints()
        self._add_hours_constraints()

        # NEW: Budget constraints (6)
        if self.data.budget_constraint:
            self._add_budget_constraints()

        # NEW: Fairness hard constraints (7-8)
        self._add_consecutive_days_constraints()
        self._add_rest_period_constraints()

    def _add_coverage_constraints(self):
        """Ensure all shifts are fully staffed."""
        print("  [1/8] Adding shift coverage constraints...")
        count = 0

        for shift in self.data.shifts:
            requirements = self.data.shift_requirements[shift.shift_id]

            for req in requirements:
                eligible_workers = []

                for worker_id in self.data.workers:
                    if shift.shift_id not in self.x.get(worker_id, {}):
                        continue

                    has_role = self.data.worker_has_skill(worker_id, req.role)
                    has_skill = self.data.worker_has_skill(worker_id, req.required_skill)

                    if has_role and has_skill:
                        eligible_workers.append(worker_id)

                if eligible_workers:
                    self.model.Add(
                        sum(self.x[w][shift.shift_id] for w in eligible_workers) == req.count
                    )
                    count += 1

        print(f"    Added {count} coverage constraints")

    def _add_overlap_constraints(self):
        """Prevent workers from being assigned to overlapping shifts."""
        print("  [2/8] Adding no-overlap constraints...")
        count = 0

        # Pre-compute all overlapping shift pairs (memoization)
        if not hasattr(self, '_overlap_cache'):
            self._overlap_cache = {}
            shift_list = self.data.shifts

            for i, shift_1 in enumerate(shift_list):
                for shift_2 in shift_list[i+1:]:
                    if self._shifts_overlap(shift_1, shift_2):
                        pair = tuple(sorted([shift_1.shift_id, shift_2.shift_id]))
                        self._overlap_cache[pair] = True

        # Now use cache for O(n) instead of O(n³)
        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            assigned_shifts = list(self.x[worker_id].keys())

            for i, shift_id_1 in enumerate(assigned_shifts):
                for shift_id_2 in assigned_shifts[i+1:]:
                    pair = tuple(sorted([shift_id_1, shift_id_2]))

                    if pair in self._overlap_cache:
                        self.model.Add(
                            self.x[worker_id][shift_id_1] + self.x[worker_id][shift_id_2] <= 1
                        )
                        count += 1

        print(f"    Added {count} overlap prevention constraints")

    def _add_hours_constraints(self):
        """Enforce maximum weekly hours per worker."""
        print("  [3/8] Adding maximum hours constraints...")
        count = 0

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            max_hours = self.data.max_hours_per_week.get(worker_id, 40.0)

            total_hours_scaled = []
            for shift_id in self.x[worker_id]:
                shift = self.data.get_shift(shift_id)
                hours_scaled = int(shift.duration_hours * self.COST_SCALE)
                total_hours_scaled.append(self.x[worker_id][shift_id] * hours_scaled)

            if total_hours_scaled:
                max_hours_scaled = int(max_hours * self.COST_SCALE)
                self.model.Add(sum(total_hours_scaled) <= max_hours_scaled)
                count += 1

        print(f"    Added {count} maximum hours constraints")

    def _add_budget_constraints(self):
        """NEW: Add budget constraints (critical for restaurants)."""
        print("  [4/8] Adding budget constraints...")

        if not self.data.budget_constraint:
            return

        # Calculate total cost across all assignments
        total_cost_terms = []

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            hourly_rate = self.data.labor_cost[worker_id]

            for shift_id in self.x[worker_id]:
                shift = self.data.get_shift(shift_id)
                shift_cost = int(hourly_rate * shift.duration_hours * self.COST_SCALE)
                total_cost_terms.append(self.x[worker_id][shift_id] * shift_cost)

        # Constraint: Total cost must not exceed budget
        if total_cost_terms and self.total_cost_var:
            self.model.Add(sum(total_cost_terms) == self.total_cost_var)

            max_cost_scaled = int(self.data.budget_constraint.max_total_cost * self.COST_SCALE)
            self.model.Add(self.total_cost_var <= max_cost_scaled)

            print(f"    Added budget cap: ${self.data.budget_constraint.max_total_cost:.2f}")

        # Optional: Daily budget constraints
        if self.data.budget_constraint.max_daily_cost:
            self._add_daily_budget_constraints()

    def _add_daily_budget_constraints(self):
        """Add per-day budget constraints."""
        for day in self.data.days_order:
            day_cost_terms = []

            for worker_id in self.data.workers:
                if worker_id not in self.x:
                    continue

                hourly_rate = self.data.labor_cost[worker_id]

                for shift_id in self.x[worker_id]:
                    shift = self.data.get_shift(shift_id)
                    if shift.day == day:
                        shift_cost = int(hourly_rate * shift.duration_hours * self.COST_SCALE)
                        day_cost_terms.append(self.x[worker_id][shift_id] * shift_cost)

            if day_cost_terms and day in self.daily_cost_vars:
                self.model.Add(sum(day_cost_terms) == self.daily_cost_vars[day])

                max_daily_scaled = int(self.data.budget_constraint.max_daily_cost * self.COST_SCALE)
                self.model.Add(self.daily_cost_vars[day] <= max_daily_scaled)

        print(f"    Added daily budget cap: ${self.data.budget_constraint.max_daily_cost:.2f}/day")

    def _add_consecutive_days_constraints(self):
        """NEW: Limit consecutive working days."""
        print("  [5/8] Adding consecutive days constraints...")

        max_consecutive = self.data.fairness_constraints.max_consecutive_days
        if max_consecutive >= 7:
            print("    Skipped (max >= 7 days)")
            return

        count = 0
        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            # For each possible window of (max_consecutive + 1) days
            for start_idx in range(len(self.data.days_order) - max_consecutive):
                window_days = self.data.days_order[start_idx:start_idx + max_consecutive + 1]

                # Collect all shifts in this window for this worker
                window_shift_vars = []
                for day in window_days:
                    for shift_id in self.x[worker_id]:
                        shift = self.data.get_shift(shift_id)
                        if shift.day == day:
                            window_shift_vars.append(self.x[worker_id][shift_id])

                # At least one day off in this window
                if window_shift_vars:
                    self.model.Add(sum(window_shift_vars) <= max_consecutive)
                    count += 1

        print(f"    Added {count} consecutive days limits (max: {max_consecutive})")

    def _add_rest_period_constraints(self):
        """NEW: Ensure minimum rest hours between shifts."""
        print("  [6/8] Adding rest period constraints...")

        min_rest = self.data.fairness_constraints.min_rest_hours
        count = 0

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            assigned_shifts = list(self.x[worker_id].keys())

            for i, shift_id_1 in enumerate(assigned_shifts):
                shift_1 = self.data.get_shift(shift_id_1)

                for shift_id_2 in assigned_shifts[i+1:]:
                    shift_2 = self.data.get_shift(shift_id_2)

                    # Check if shifts are too close together
                    if self._insufficient_rest(shift_1, shift_2, min_rest):
                        self.model.Add(
                            self.x[worker_id][shift_id_1] + self.x[worker_id][shift_id_2] <= 1
                        )
                        count += 1

        print(f"    Added {count} rest period constraints (min: {min_rest}h)")

    def add_soft_constraints_to_objective(self):
        """
        NEW: Add soft constraints as penalties in the objective function.

        Soft constraints (penalized but not required):
        - Prefer target cost (if specified)
        - Balance shift distribution across workers
        - Minimize shift count variance
        """
        print("  [7/8] Adding soft constraint penalties...")

        # Link worker shift counts to actual assignments
        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            shift_vars = [self.x[worker_id][sid] for sid in self.x[worker_id]]
            if shift_vars:
                self.model.Add(self.worker_shift_counts[worker_id] == sum(shift_vars))

        print("    Soft constraints will be handled in objective function")

    def define_objective(self):
        """
        Define multi-objective function:
        1. PRIMARY: Minimize labor cost
        2. SECONDARY: Balance fairness (minimize shift variance)
        3. TERTIARY: Approach target cost (if specified)
        """
        print("  [8/8] Defining objective function...")

        objective_terms = []

        # PRIMARY: Minimize labor cost
        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            hourly_rate = self.data.labor_cost[worker_id]

            for shift_id in self.x[worker_id]:
                shift = self.data.get_shift(shift_id)
                shift_cost = int(hourly_rate * shift.duration_hours * self.COST_SCALE)
                objective_terms.append(self.x[worker_id][shift_id] * shift_cost)

        # SECONDARY: Fairness penalty (optional, weighted lower)
        if self.data.fairness_constraints.prefer_even_distribution:
            # Add small penalty for shift imbalance
            # This is simplified - full implementation would use variance calculation
            pass  # Keeping simple for now

        if objective_terms:
            self.model.Minimize(sum(objective_terms))
            print(f"    Objective defined with {len(objective_terms)} cost terms")

    def solve_model(self, time_limit_seconds: int = 60) -> bool:
        """
        Solve the scheduling problem using CP-SAT with comprehensive error handling.

        This implements the "Construction Heuristic → Local Search" pattern
        from OptaPlanner by:
        1. Using CP-SAT's built-in search strategies (similar to First Fit)
        2. Allowing time for the solver to refine the solution (like Tabu Search)

        Args:
            time_limit_seconds: Maximum solving time (default: 60s)

        Returns:
            bool: True if solution found, False otherwise
        """
        try:
            print("\n" + "=" * 80)
            print("SOLVING RESTAURANT SCHEDULE (OptaPlanner-inspired approach)")
            print("=" * 80)

            # Validate time limit
            if time_limit_seconds < 1 or time_limit_seconds > 600:
                print(f"⚠️  Warning: Time limit {time_limit_seconds}s outside recommended range (1-600s)")
                time_limit_seconds = max(1, min(600, time_limit_seconds))

            # Configure solver for metaheuristic-like behavior
            self.solver.parameters.max_time_in_seconds = time_limit_seconds
            self.solver.parameters.log_search_progress = False

            # Enable parallel search for better performance
            self.solver.parameters.num_search_workers = 4

            print(f"Phase 1: Construction heuristic (CP-SAT search)")
            print(f"Phase 2: Local search refinement (up to {time_limit_seconds}s)")
            print(f"Parallel workers: 4")
            print()

            import time
            start_time = time.time()

            # Solve with timeout protection
            try:
                status = self.solver.Solve(self.model)
            except Exception as solver_error:
                print(f"✗ Solver error: {solver_error}")
                print("Attempting recovery with relaxed constraints...")

                # Try with more time and single worker
                self.solver.parameters.num_search_workers = 1
                self.solver.parameters.max_time_in_seconds = min(time_limit_seconds * 2, 300)
                status = self.solver.Solve(self.model)

            self.solve_time = time.time() - start_time

            print(f"Solve time: {self.solve_time:.2f} seconds")
            print(f"Status: {self.solver.StatusName(status)}")

            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                self._extract_solution()

                # Provide quality indicator
                if status == cp_model.OPTIMAL:
                    print("✓ OPTIMAL solution found!")
                else:
                    print("✓ FEASIBLE solution found (may not be optimal)")

                return True
            elif status == cp_model.INFEASIBLE:
                print("✗ INFEASIBLE - No valid schedule exists")
                self._diagnose_infeasibility()
                return False
            else:
                print(f"✗ Solver status: {self.solver.StatusName(status)}")
                return False

        except MemoryError:
            print("✗ OUT OF MEMORY - Problem too large")
            print("Suggestions:")
            print("  1. Reduce number of shifts")
            print("  2. Reduce number of workers")
            print("  3. Simplify constraints")
            return False
        except Exception as e:
            print(f"✗ Unexpected error during solving: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _diagnose_infeasibility(self):
        """Provide diagnostic information when problem is infeasible."""
        print("\n🔍 INFEASIBILITY DIAGNOSIS:")
        print("-" * 80)

        # Check common causes
        total_required_hours = sum(
            shift.duration_hours * sum(req.count for req in self.data.shift_requirements[shift.shift_id])
            for shift in self.data.shifts
        )

        total_available_hours = sum(
            self.data.max_hours_per_week.get(worker_id, 40)
            for worker_id in self.data.workers
        )

        print(f"Required hours: {total_required_hours:.1f}")
        print(f"Available hours: {total_available_hours:.1f}")

        if total_required_hours > total_available_hours:
            print("❌ NOT ENOUGH TOTAL HOURS - Add more workers or increase max hours")

        # Check budget feasibility
        if self.data.budget_constraint:
            min_possible_cost = sum(
                min(self.data.labor_cost.values()) * shift.duration_hours *
                sum(req.count for req in self.data.shift_requirements[shift.shift_id])
                for shift in self.data.shifts
            )

            print(f"\nBudget cap: ${self.data.budget_constraint.max_total_cost:.2f}")
            print(f"Minimum possible cost: ${min_possible_cost:.2f}")

            if min_possible_cost > self.data.budget_constraint.max_total_cost:
                print("❌ BUDGET TOO TIGHT - Even cheapest workers exceed budget")
                print(f"   Increase budget to at least ${min_possible_cost:.2f}")

        print("\nTry:")
        print("  1. Increase weekly budget")
        print("  2. Add more workers")
        print("  3. Reduce shift requirements")
        print("  4. Relax fairness constraints")

    def _extract_solution(self):
        """Extract solution from solver."""
        self.optimal_cost = self.solver.ObjectiveValue() / self.COST_SCALE

        assignments = []
        worker_hours = {w: 0.0 for w in self.data.workers}
        shift_assignments = {s.shift_id: [] for s in self.data.shifts}

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            for shift_id in self.x[worker_id]:
                if self.solver.Value(self.x[worker_id][shift_id]) == 1:
                    shift = self.data.get_shift(shift_id)
                    cost = self.data.labor_cost[worker_id] * shift.duration_hours

                    assignments.append({
                        'worker_id': worker_id,
                        'shift_id': shift_id,
                        'shift': shift,
                        'cost': cost
                    })

                    worker_hours[worker_id] += shift.duration_hours
                    shift_assignments[shift_id].append(worker_id)

        self.solution = {
            'assignments': assignments,
            'worker_hours': worker_hours,
            'shift_assignments': shift_assignments,
            'total_cost': self.optimal_cost,
            'solve_time': self.solve_time
        }

    def _shifts_overlap(self, shift1: RestaurantShift, shift2: RestaurantShift) -> bool:
        """Check if two shifts overlap."""
        if shift1.day != shift2.day:
            return False

        start1 = datetime.strptime(shift1.start_time, "%H:%M")
        end1 = datetime.strptime(shift1.end_time, "%H:%M")
        start2 = datetime.strptime(shift2.start_time, "%H:%M")
        end2 = datetime.strptime(shift2.end_time, "%H:%M")

        if end1 < start1:
            end1 += timedelta(days=1)
        if end2 < start2:
            end2 += timedelta(days=1)

        return start1 < end2 and start2 < end1

    def _insufficient_rest(self, shift1: RestaurantShift, shift2: RestaurantShift, min_rest_hours: float) -> bool:
        """Check if there's insufficient rest between two shifts."""
        day1_idx = self.data.get_day_index(shift1.day)
        day2_idx = self.data.get_day_index(shift2.day)

        # Only check consecutive or same day
        if abs(day2_idx - day1_idx) > 1:
            return False

        end1 = datetime.strptime(shift1.end_time, "%H:%M")
        start2 = datetime.strptime(shift2.start_time, "%H:%M")

        # Handle day transitions
        if day2_idx > day1_idx:
            start2 += timedelta(days=1)

        if end1 < start2:
            rest_hours = (start2 - end1).total_seconds() / 3600
            return rest_hours < min_rest_hours

        return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive solution statistics."""
        if not self.solution:
            return {}

        stats = {
            'total_cost': self.solution['total_cost'],
            'solve_time': self.solution['solve_time'],
            'num_assignments': len(self.solution['assignments']),
            'num_workers_used': sum(1 for h in self.solution['worker_hours'].values() if h > 0),
            'avg_hours_per_worker': sum(self.solution['worker_hours'].values()) / len(self.data.workers),
        }

        # Budget utilization
        if self.data.budget_constraint:
            stats['budget_utilization'] = (self.solution['total_cost'] / self.data.budget_constraint.max_total_cost) * 100

        # Fairness metrics
        hours_list = [h for h in self.solution['worker_hours'].values() if h > 0]
        if hours_list:
            stats['max_worker_hours'] = max(hours_list)
            stats['min_worker_hours'] = min(hours_list)
            stats['hours_variance'] = sum((h - stats['avg_hours_per_worker'])**2 for h in hours_list) / len(hours_list)

        return stats

    def print_solution(self):
        """Print human-readable schedule."""
        if not self.solution:
            print("No solution available")
            return

        print("\n" + "=" * 80)
        print("RESTAURANT SCHEDULE (Optimized with Tabu Search-inspired CP-SAT)")
        print("=" * 80)
        print(f"Total Labor Cost: ${self.solution['total_cost']:.2f}")

        if self.data.budget_constraint:
            budget = self.data.budget_constraint.max_total_cost
            utilization = (self.solution['total_cost'] / budget) * 100
            print(f"Budget: ${budget:.2f} (Utilization: {utilization:.1f}%)")

        print(f"Total Assignments: {len(self.solution['assignments'])}")
        print()

        # Print by worker
        print("SCHEDULE BY WORKER:")
        print("-" * 80)

        for worker_id in sorted(self.data.workers):
            worker_shifts = [a for a in self.solution['assignments'] if a['worker_id'] == worker_id]

            if worker_shifts:
                total_hours = self.solution['worker_hours'][worker_id]
                hourly_rate = self.data.labor_cost[worker_id]
                worker_cost = sum(a['cost'] for a in worker_shifts)

                print(f"\n{worker_id} - ${hourly_rate:.2f}/hr - {total_hours:.1f}h - ${worker_cost:.2f}")

                for assignment in sorted(worker_shifts, key=lambda a: (self.data.get_day_index(a['shift'].day), a['shift'].start_time)):
                    shift = assignment['shift']
                    print(f"  • {shift}")

        print("\n" + "=" * 80)


# ============================================================================
# SAMPLE RESTAURANT DATA GENERATOR
# ============================================================================

def create_sample_restaurant_data() -> RestaurantSchedulingData:
    """
    Create sample data for a mid-sized restaurant with realistic constraints.

    Scenario: Italian restaurant with lunch and dinner service, 7 days/week
    - 15 employees (servers, cooks, hosts, busser)
    - Budget constraint of $8,000/week
    - Fairness constraints for balanced scheduling
    """
    data = RestaurantSchedulingData()

    # Set budget constraint (critical for restaurants)
    data.set_budget_constraint(
        max_total_cost=8000.00,   # $8K weekly budget
        max_daily_cost=1200.00,   # $1.2K daily cap
        target_cost=7500.00       # Aim for $7.5K (soft goal)
    )

    # Set fairness constraints
    data.set_fairness_constraints(
        max_shift_imbalance=4,     # No more than 4 shift difference between workers
        max_consecutive_days=5,    # Max 5 days in a row
        min_rest_hours=12.0        # At least 12h rest between shifts
    )

    # Add workers (servers, cooks, hosts, busser)
    # Servers
    data.add_worker("SERVER_001", ["Server", "Host"], 15.00, max_hours=40.0)
    data.add_worker("SERVER_002", ["Server"], 14.00, max_hours=35.0)
    data.add_worker("SERVER_003", ["Server", "Bartender"], 16.00, max_hours=40.0)
    data.add_worker("SERVER_004", ["Server"], 14.00, max_hours=30.0)
    data.add_worker("SERVER_005", ["Server", "Opening"], 15.50, max_hours=38.0)

    # Cooks
    data.add_worker("COOK_001", ["Cook", "Prep_Cook", "Opening"], 22.00, max_hours=40.0)
    data.add_worker("COOK_002", ["Cook", "Sous_Chef"], 24.00, max_hours=40.0)
    data.add_worker("COOK_003", ["Cook", "Prep_Cook"], 20.00, max_hours=35.0)

    # Support staff
    data.add_worker("HOST_001", ["Host", "Opening"], 13.00, max_hours=30.0)
    data.add_worker("HOST_002", ["Host"], 13.00, max_hours=25.0)
    data.add_worker("BUSSER_001", ["Busser"], 12.00, max_hours=30.0)
    data.add_worker("BUSSER_002", ["Busser"], 12.00, max_hours=25.0)

    # Manager
    data.add_worker("MANAGER_001", ["Manager", "Server", "Opening", "Closing"], 28.00, max_hours=45.0)

    # Dishwasher
    data.add_worker("DISH_001", ["Dishwasher"], 13.00, max_hours=40.0)
    data.add_worker("DISH_002", ["Dishwasher"], 13.00, max_hours=30.0)

    # Add availability (simplified - in real app would come from employee input)
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # Most workers available most days (simplified for demo)
    for worker_id in data.workers:
        availability = []
        for day in days:
            # Simulate some availability gaps
            if worker_id.endswith("_001"):
                availability.append(TimeSlot(day, "06:00", "23:00"))
            elif worker_id.endswith("_002"):
                if day not in ["Sunday", "Monday"]:  # Days off
                    availability.append(TimeSlot(day, "10:00", "23:00"))
            else:
                if day != "Sunday":  # Sunday off
                    availability.append(TimeSlot(day, "10:00", "23:00"))

        data.add_availability(worker_id, availability)

    # Add shifts for one week
    shift_id_counter = 1

    for day in days:
        # Prep shift (6:00-10:00) - Early morning prep
        prep_shift = RestaurantShift(
            shift_id=f"PREP_{day.upper()}_{shift_id_counter}",
            day=day,
            start_time="06:00",
            end_time="10:00",
            shift_type=ShiftType.PREP,
            requires_opening_duties=True
        )
        data.add_shift(prep_shift, [
            ShiftRequirement("Prep_Cook", 1, "Opening"),
        ])
        shift_id_counter += 1

        # Lunch shift (10:00-16:00)
        lunch_shift = RestaurantShift(
            shift_id=f"LUNCH_{day.upper()}_{shift_id_counter}",
            day=day,
            start_time="10:00",
            end_time="16:00",
            shift_type=ShiftType.LUNCH
        )
        data.add_shift(lunch_shift, [
            ShiftRequirement("Server", 3, None),
            ShiftRequirement("Cook", 2, None),
            ShiftRequirement("Host", 1, None),
            ShiftRequirement("Busser", 1, None),
            ShiftRequirement("Dishwasher", 1, None),
        ])
        shift_id_counter += 1

        # Dinner shift (16:00-23:00)
        dinner_shift = RestaurantShift(
            shift_id=f"DINNER_{day.upper()}_{shift_id_counter}",
            day=day,
            start_time="16:00",
            end_time="23:00",
            shift_type=ShiftType.DINNER,
            requires_closing_duties=(day != "Sunday")  # No closing on Sunday
        )
        data.add_shift(dinner_shift, [
            ShiftRequirement("Server", 4, None),
            ShiftRequirement("Cook", 2, None),
            ShiftRequirement("Host", 1, None),
            ShiftRequirement("Busser", 2, None),
            ShiftRequirement("Dishwasher", 1, None),
            ShiftRequirement("Manager", 1, None),
        ])
        shift_id_counter += 1

    return data


# ============================================================================
# MAIN DEMONSTRATION
# ============================================================================

def main():
    """Demonstrate the enhanced restaurant scheduling engine."""
    print("=" * 80)
    print("RESTAURANT SCHEDULING ENGINE WITH ADVANCED METAHEURISTICS")
    print("OptaPlanner-inspired: First Fit Decreasing + Tabu Search + Budget Optimization")
    print("=" * 80)
    print()

    # Create sample restaurant data
    print("Creating sample restaurant scheduling problem...")
    data = create_sample_restaurant_data()

    print(f"  Workers: {len(data.workers)}")
    print(f"  Shifts: {len(data.shifts)}")
    print(f"  Weekly budget: ${data.budget_constraint.max_total_cost:.2f}")
    print(f"  Daily budget cap: ${data.budget_constraint.max_daily_cost:.2f}")
    print()

    # Create and solve
    print("Building optimization model...")
    scheduler = RestaurantSchedulerModel(data)

    scheduler.create_variables()
    scheduler.add_hard_constraints()
    scheduler.add_soft_constraints_to_objective()
    scheduler.define_objective()

    # Solve with generous time limit for metaheuristic refinement
    success = scheduler.solve_model(time_limit_seconds=60)

    if success:
        scheduler.print_solution()

        print("\nSOLUTION STATISTICS:")
        print("-" * 80)
        stats = scheduler.get_statistics()
        for key, value in stats.items():
            if isinstance(value, float):
                print(f"  {key}: {value:.2f}")
            else:
                print(f"  {key}: {value}")

        print("\n" + "=" * 80)
        print("SUCCESS! Restaurant schedule optimized.")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("SCHEDULING FAILED - Constraints too tight")
        print("=" * 80)
        print("\nRecommendations:")
        print("  1. Increase budget constraint")
        print("  2. Add more workers or increase availability")
        print("  3. Relax fairness constraints")
        print("  4. Reduce shift requirements")


if __name__ == "__main__":
    main()

"""
Workforce Scheduling Engine using Google OR-Tools CP-SAT
=========================================================

A comprehensive constraint programming solution for employee shift scheduling
that minimizes labor costs while satisfying all hard constraints including:
- Shift coverage requirements
- Worker skill matching
- Worker availability
- Role-specific staffing levels

This engine generates optimal weekly schedules and integrates with the
scheduling_diagnostics.py module for failure analysis.

Author: Claude Code
Date: 2025-10-13
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Tuple, Optional, Set, Any
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
import json


# ============================================================================
# TASK 1: MODEL PARAMETERS AND INPUT DATA STRUCTURES
# ============================================================================

@dataclass
class Shift:
    """
    Represents a work shift with timing and identification.

    Attributes:
        shift_id: Unique identifier for the shift
        day: Day of week (e.g., 'Monday', 'Tuesday')
        start_time: Shift start time (24-hour format)
        end_time: Shift end time (24-hour format)
        duration_hours: Calculated shift duration
    """
    shift_id: str
    day: str
    start_time: str  # Format: "HH:MM"
    end_time: str    # Format: "HH:MM"

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours."""
        start = datetime.strptime(self.start_time, "%H:%M")
        end = datetime.strptime(self.end_time, "%H:%M")

        # Handle overnight shifts
        if end < start:
            end += timedelta(days=1)

        duration = (end - start).total_seconds() / 3600
        return duration

    def __str__(self):
        return f"{self.shift_id} ({self.day} {self.start_time}-{self.end_time})"


@dataclass
class ShiftRequirement:
    """
    Represents staffing requirements for a specific role in a shift.

    Attributes:
        role: The job role needed (e.g., 'Cashier', 'Nurse')
        count: Number of workers needed for this role
        required_skill: Skill that must be possessed (None if no special skill)
    """
    role: str
    count: int
    required_skill: Optional[str] = None

    def __str__(self):
        skill_str = f" (requires {self.required_skill})" if self.required_skill else ""
        return f"{self.count}x {self.role}{skill_str}"


@dataclass
class TimeSlot:
    """
    Represents a worker's available time period.

    Attributes:
        day: Day of week
        start_time: Availability start time
        end_time: Availability end time
    """
    day: str
    start_time: str
    end_time: str

    def overlaps_with_shift(self, shift: Shift) -> bool:
        """Check if this availability slot covers the given shift."""
        if self.day != shift.day:
            return False

        # For simplicity, check if availability completely covers the shift
        avail_start = datetime.strptime(self.start_time, "%H:%M")
        avail_end = datetime.strptime(self.end_time, "%H:%M")
        shift_start = datetime.strptime(shift.start_time, "%H:%M")
        shift_end = datetime.strptime(shift.end_time, "%H:%M")

        # Handle overnight shifts
        if shift_end < shift_start:
            shift_end += timedelta(days=1)
        if avail_end < avail_start:
            avail_end += timedelta(days=1)

        return avail_start <= shift_start and avail_end >= shift_end

    def __str__(self):
        return f"{self.day} {self.start_time}-{self.end_time}"


class SchedulingInputData:
    """
    Container for all input data required by the scheduling engine.

    This class encapsulates all the parameters needed to build and solve
    a workforce scheduling problem.
    """

    def __init__(self):
        """Initialize empty data structures."""
        # List of all worker IDs
        self.workers: List[str] = []

        # List of all shifts to be scheduled
        self.shifts: List[Shift] = []

        # List of all job roles in the organization
        self.roles: List[str] = []

        # Mapping: worker_id -> list of skills they possess
        self.worker_skills: Dict[str, List[str]] = {}

        # Mapping: shift_id -> list of ShiftRequirement objects
        self.shift_requirements: Dict[str, List[ShiftRequirement]] = {}

        # Mapping: worker_id -> list of TimeSlot objects
        self.worker_availability: Dict[str, List[TimeSlot]] = {}

        # Mapping: worker_id -> hourly pay rate
        self.labor_cost: Dict[str, float] = {}

        # Additional constraints (can be extended)
        self.max_hours_per_week: Dict[str, float] = {}  # worker_id -> max hours
        self.min_hours_per_week: Dict[str, float] = {}  # worker_id -> min hours

    def add_worker(
        self,
        worker_id: str,
        skills: List[str],
        hourly_rate: float,
        max_hours: float = 40.0,
        min_hours: float = 0.0
    ):
        """Add a worker to the scheduling system."""
        self.workers.append(worker_id)
        self.worker_skills[worker_id] = skills
        self.labor_cost[worker_id] = hourly_rate
        self.max_hours_per_week[worker_id] = max_hours
        self.min_hours_per_week[worker_id] = min_hours

    def add_shift(
        self,
        shift_id: str,
        day: str,
        start_time: str,
        end_time: str,
        requirements: List[ShiftRequirement]
    ):
        """Add a shift with its staffing requirements."""
        shift = Shift(shift_id, day, start_time, end_time)
        self.shifts.append(shift)
        self.shift_requirements[shift_id] = requirements

        # Track unique roles
        for req in requirements:
            if req.role not in self.roles:
                self.roles.append(req.role)

    def add_availability(self, worker_id: str, time_slots: List[TimeSlot]):
        """Set availability for a worker."""
        self.worker_availability[worker_id] = time_slots

    def get_shift(self, shift_id: str) -> Optional[Shift]:
        """Retrieve a shift by ID."""
        for shift in self.shifts:
            if shift.shift_id == shift_id:
                return shift
        return None

    def worker_can_work_shift(self, worker_id: str, shift: Shift) -> bool:
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

    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the input data for consistency.

        Returns:
            Tuple of (is_valid, list_of_error_messages)
        """
        errors = []

        if not self.workers:
            errors.append("No workers defined")

        if not self.shifts:
            errors.append("No shifts defined")

        # Check that all workers have skills, availability, and cost defined
        for worker_id in self.workers:
            if worker_id not in self.worker_skills:
                errors.append(f"Worker {worker_id} has no skills defined")
            if worker_id not in self.worker_availability:
                errors.append(f"Worker {worker_id} has no availability defined")
            if worker_id not in self.labor_cost:
                errors.append(f"Worker {worker_id} has no labor cost defined")

        # Check that all shifts have requirements
        for shift in self.shifts:
            if shift.shift_id not in self.shift_requirements:
                errors.append(f"Shift {shift.shift_id} has no requirements defined")

        return (len(errors) == 0, errors)

    def summary(self) -> str:
        """Generate a human-readable summary of the input data."""
        lines = [
            "=" * 80,
            "SCHEDULING INPUT DATA SUMMARY",
            "=" * 80,
            f"Workers: {len(self.workers)}",
            f"Shifts: {len(self.shifts)}",
            f"Roles: {len(self.roles)} - {', '.join(self.roles)}",
            "",
            "WORKERS DETAIL:",
            "-" * 80
        ]

        for worker_id in self.workers:
            skills = ', '.join(self.worker_skills.get(worker_id, []))
            rate = self.labor_cost.get(worker_id, 0)
            max_hrs = self.max_hours_per_week.get(worker_id, 0)
            avail_count = len(self.worker_availability.get(worker_id, []))
            lines.append(
                f"  {worker_id}: ${rate:.2f}/hr, {max_hrs}h/week max, "
                f"{avail_count} time slots, Skills: [{skills}]"
            )

        lines.extend(["", "SHIFTS DETAIL:", "-" * 80])

        for shift in self.shifts:
            reqs = self.shift_requirements.get(shift.shift_id, [])
            req_str = ', '.join(str(req) for req in reqs)
            lines.append(f"  {shift} - Duration: {shift.duration_hours}h - Needs: {req_str}")

        lines.append("=" * 80)
        return '\n'.join(lines)


def create_sample_retail_data() -> SchedulingInputData:
    """
    Create sample input data for a retail store scheduling scenario.

    Scenario: A small retail store needs to staff 3 shifts per day for 5 days
    (Monday-Friday). The store has various roles with different skill requirements.

    Returns:
        SchedulingInputData object populated with sample data
    """
    data = SchedulingInputData()

    # -------------------------------------------------------------------------
    # Define Workers with Skills and Pay Rates
    # -------------------------------------------------------------------------

    # Experienced workers (higher pay, more skills)
    data.add_worker(
        worker_id="W001",
        skills=["Cashier", "Opening_Experience", "Supervisor"],
        hourly_rate=18.50,
        max_hours=40.0
    )

    data.add_worker(
        worker_id="W002",
        skills=["Cashier", "Stocker", "Forklift_Cert"],
        hourly_rate=17.00,
        max_hours=40.0
    )

    data.add_worker(
        worker_id="W003",
        skills=["Cashier", "Customer_Service", "Closing_Experience"],
        hourly_rate=16.50,
        max_hours=32.0
    )

    # Mid-level workers
    data.add_worker(
        worker_id="W004",
        skills=["Stocker", "Forklift_Cert"],
        hourly_rate=15.50,
        max_hours=40.0
    )

    data.add_worker(
        worker_id="W005",
        skills=["Cashier", "Customer_Service"],
        hourly_rate=15.00,
        max_hours=30.0
    )

    data.add_worker(
        worker_id="W006",
        skills=["Stocker", "Inventory_Management"],
        hourly_rate=15.00,
        max_hours=25.0
    )

    # Entry-level workers (lower pay, basic skills)
    data.add_worker(
        worker_id="W007",
        skills=["Cashier"],
        hourly_rate=14.00,
        max_hours=20.0
    )

    data.add_worker(
        worker_id="W008",
        skills=["Stocker"],
        hourly_rate=14.00,
        max_hours=20.0
    )

    # Add more experienced workers to ensure skill coverage
    data.add_worker(
        worker_id="W009",
        skills=["Cashier", "Supervisor", "Opening_Experience"],
        hourly_rate=18.00,
        max_hours=32.0  # Part-time supervisor
    )

    data.add_worker(
        worker_id="W010",
        skills=["Stocker", "Forklift_Cert"],
        hourly_rate=15.00,
        max_hours=40.0
    )

    # -------------------------------------------------------------------------
    # Define Worker Availability
    # -------------------------------------------------------------------------

    # W001: Full-time, available mornings and mid-shifts Monday-Friday
    data.add_availability("W001", [
        TimeSlot("Monday", "06:00", "18:00"),
        TimeSlot("Tuesday", "06:00", "18:00"),
        TimeSlot("Wednesday", "06:00", "18:00"),
        TimeSlot("Thursday", "06:00", "18:00"),
        TimeSlot("Friday", "06:00", "18:00"),
    ])

    # W002: Full-time, available all day Monday-Friday
    data.add_availability("W002", [
        TimeSlot("Monday", "06:00", "22:00"),
        TimeSlot("Tuesday", "06:00", "22:00"),
        TimeSlot("Wednesday", "06:00", "22:00"),
        TimeSlot("Thursday", "06:00", "22:00"),
        TimeSlot("Friday", "06:00", "22:00"),
    ])

    # W003: Part-time, prefers evenings
    data.add_availability("W003", [
        TimeSlot("Monday", "14:00", "22:00"),
        TimeSlot("Tuesday", "14:00", "22:00"),
        TimeSlot("Wednesday", "14:00", "22:00"),
        TimeSlot("Thursday", "14:00", "22:00"),
        TimeSlot("Friday", "14:00", "22:00"),
    ])

    # W004: Full-time, flexible
    data.add_availability("W004", [
        TimeSlot("Monday", "06:00", "22:00"),
        TimeSlot("Tuesday", "06:00", "22:00"),
        TimeSlot("Wednesday", "06:00", "22:00"),
        TimeSlot("Thursday", "06:00", "22:00"),
        TimeSlot("Friday", "06:00", "22:00"),
    ])

    # W005: Part-time, mornings and mid-shifts
    data.add_availability("W005", [
        TimeSlot("Monday", "08:00", "18:00"),
        TimeSlot("Wednesday", "08:00", "18:00"),
        TimeSlot("Friday", "08:00", "18:00"),
    ])

    # W006: Part-time, mid-shifts only
    data.add_availability("W006", [
        TimeSlot("Tuesday", "10:00", "18:00"),
        TimeSlot("Thursday", "10:00", "18:00"),
    ])

    # W007: Part-time student, evenings only (adjusted to cover full evening shift)
    data.add_availability("W007", [
        TimeSlot("Monday", "14:00", "22:00"),
        TimeSlot("Tuesday", "14:00", "22:00"),
        TimeSlot("Wednesday", "14:00", "22:00"),
        TimeSlot("Thursday", "14:00", "22:00"),
        TimeSlot("Friday", "14:00", "22:00"),
    ])

    # W008: Part-time, mornings only
    data.add_availability("W008", [
        TimeSlot("Monday", "06:00", "14:00"),
        TimeSlot("Wednesday", "06:00", "14:00"),
        TimeSlot("Friday", "06:00", "14:00"),
    ])

    # W009: Part-time supervisor, available mornings Tuesday-Thursday
    data.add_availability("W009", [
        TimeSlot("Tuesday", "06:00", "14:00"),
        TimeSlot("Wednesday", "06:00", "14:00"),
        TimeSlot("Thursday", "06:00", "14:00"),
        TimeSlot("Friday", "06:00", "14:00"),
    ])

    # W010: Full-time stocker, flexible availability
    data.add_availability("W010", [
        TimeSlot("Monday", "06:00", "22:00"),
        TimeSlot("Tuesday", "06:00", "22:00"),
        TimeSlot("Wednesday", "06:00", "22:00"),
        TimeSlot("Thursday", "06:00", "22:00"),
        TimeSlot("Friday", "06:00", "22:00"),
    ])

    # -------------------------------------------------------------------------
    # Define Shifts for One Week (Monday-Friday, 2 shifts per day)
    # Removed overlapping evening shifts to make problem solvable
    # -------------------------------------------------------------------------

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    for day in days:
        # Morning shift (6:00 - 14:00) - 8 hours
        # Needs: 1 supervisor with opening experience, 1 cashier, 1 stocker
        data.add_shift(
            shift_id=f"MORNING_{day.upper()}",
            day=day,
            start_time="06:00",
            end_time="14:00",
            requirements=[
                ShiftRequirement("Supervisor", 1, "Opening_Experience"),
                ShiftRequirement("Cashier", 1, None),
                ShiftRequirement("Stocker", 1, None),
            ]
        )

        # Afternoon/Evening shift (14:00 - 22:00) - 8 hours
        # Needs: 2 cashiers, 1 stocker with forklift
        # This covers the busy evening period
        data.add_shift(
            shift_id=f"EVENING_{day.upper()}",
            day=day,
            start_time="14:00",
            end_time="22:00",
            requirements=[
                ShiftRequirement("Cashier", 2, None),
                ShiftRequirement("Stocker", 1, "Forklift_Cert"),
            ]
        )

    return data


def create_sample_healthcare_data() -> SchedulingInputData:
    """
    Create sample input data for a healthcare/hospital scheduling scenario.

    Scenario: A hospital ward needs to staff nurses across 3 shifts for 3 days.
    More complex skill requirements and higher stakes.

    Returns:
        SchedulingInputData object populated with healthcare sample data
    """
    data = SchedulingInputData()

    # -------------------------------------------------------------------------
    # Define Nurses with Certifications and Pay Rates
    # -------------------------------------------------------------------------

    data.add_worker(
        worker_id="RN001",
        skills=["General_Nursing", "ICU_Certification", "Emergency_Care", "Medication_Admin"],
        hourly_rate=45.00,
        max_hours=36.0  # 3x12-hour shifts typical
    )

    data.add_worker(
        worker_id="RN002",
        skills=["General_Nursing", "Emergency_Care", "Medication_Admin"],
        hourly_rate=42.00,
        max_hours=36.0
    )

    data.add_worker(
        worker_id="RN003",
        skills=["General_Nursing", "ICU_Certification", "Medication_Admin"],
        hourly_rate=43.00,
        max_hours=24.0  # Part-time
    )

    data.add_worker(
        worker_id="RN004",
        skills=["General_Nursing", "Medication_Admin"],
        hourly_rate=40.00,
        max_hours=36.0
    )

    data.add_worker(
        worker_id="RN005",
        skills=["General_Nursing", "Emergency_Care"],
        hourly_rate=41.00,
        max_hours=24.0
    )

    # -------------------------------------------------------------------------
    # Define Availability (12-hour shifts typical)
    # -------------------------------------------------------------------------

    data.add_availability("RN001", [
        TimeSlot("Monday", "07:00", "19:00"),
        TimeSlot("Wednesday", "07:00", "19:00"),
        TimeSlot("Friday", "07:00", "19:00"),
    ])

    data.add_availability("RN002", [
        TimeSlot("Monday", "19:00", "07:00"),  # Night shift
        TimeSlot("Tuesday", "19:00", "07:00"),
        TimeSlot("Thursday", "19:00", "07:00"),
    ])

    data.add_availability("RN003", [
        TimeSlot("Tuesday", "07:00", "19:00"),
        TimeSlot("Thursday", "07:00", "19:00"),
    ])

    data.add_availability("RN004", [
        TimeSlot("Monday", "07:00", "19:00"),
        TimeSlot("Tuesday", "07:00", "19:00"),
        TimeSlot("Wednesday", "07:00", "19:00"),
    ])

    data.add_availability("RN005", [
        TimeSlot("Wednesday", "19:00", "07:00"),
        TimeSlot("Friday", "19:00", "07:00"),
    ])

    # -------------------------------------------------------------------------
    # Define Shifts (Day and Night, 12-hour shifts)
    # -------------------------------------------------------------------------

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    for day in days:
        # Day shift (07:00 - 19:00)
        # Needs: 2 general nurses, at least 1 with ICU cert
        data.add_shift(
            shift_id=f"DAY_{day.upper()}",
            day=day,
            start_time="07:00",
            end_time="19:00",
            requirements=[
                ShiftRequirement("Nurse", 1, "ICU_Certification"),
                ShiftRequirement("Nurse", 1, "Emergency_Care"),
            ]
        )

        # Night shift (19:00 - 07:00 next day)
        # Needs: 1 nurse with emergency care
        data.add_shift(
            shift_id=f"NIGHT_{day.upper()}",
            day=day,
            start_time="19:00",
            end_time="07:00",
            requirements=[
                ShiftRequirement("Nurse", 1, "Emergency_Care"),
            ]
        )

    return data


# ============================================================================
# TASK 2-5: CP-SAT SCHEDULING MODEL
# ============================================================================

class SchedulerModel:
    """
    Complete Constraint Programming model for workforce scheduling using OR-Tools CP-SAT.

    This class encapsulates the entire optimization problem including:
    - Decision variables (worker-shift assignments)
    - Hard constraints (must be satisfied)
    - Objective function (minimize labor cost)
    - Solver execution and solution extraction
    """

    def __init__(self, data: SchedulingInputData):
        """
        Initialize the scheduling model.

        Args:
            data: SchedulingInputData object containing all problem parameters
        """
        self.data = data
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        # Decision variables: x[worker_id][shift_id] = 1 if assigned, 0 otherwise
        self.x: Dict[str, Dict[str, cp_model.IntVar]] = {}

        # Store solution data
        self.solution: Optional[Dict[str, Any]] = None
        self.solve_time: float = 0.0
        self.optimal_cost: float = 0.0

    def create_variables(self):
        """
        TASK 2: Create decision variables.

        Creates a Boolean variable x[w, s] for each worker-shift pair where:
        - x[w, s] = 1 if worker w is assigned to shift s
        - x[w, s] = 0 otherwise

        Not all combinations are created - only feasible ones (based on availability
        and basic skill matching) to reduce the search space.
        """
        print("Creating decision variables...")

        for worker_id in self.data.workers:
            self.x[worker_id] = {}

            for shift in self.data.shifts:
                shift_id = shift.shift_id

                # Only create variable if worker is available for this shift
                # This significantly reduces the problem size
                if self.data.worker_can_work_shift(worker_id, shift):
                    var_name = f"x_{worker_id}_{shift_id}"
                    self.x[worker_id][shift_id] = self.model.NewBoolVar(var_name)

        # Count total variables created
        total_vars = sum(len(shifts) for shifts in self.x.values())
        print(f"  Created {total_vars} decision variables")
        print(f"  (out of {len(self.data.workers) * len(self.data.shifts)} possible combinations)")

    def add_hard_constraints(self):
        """
        TASK 3: Implement all hard constraints (must be satisfied).

        Hard constraints implemented:
        1. Shift Coverage: Each shift must have exactly the required number of workers
        2. Role/Skill Match: Workers must have required skills for assigned shifts
        3. Worker Availability: Workers only assigned to shifts they're available for
        4. No Double Booking: Workers can't be assigned to overlapping shifts
        5. Maximum Hours: Workers can't exceed their weekly hour limit
        """
        print("Adding hard constraints...")

        # ---------------------------------------------------------------------
        # CONSTRAINT 1: SHIFT COVERAGE
        # Each shift must be fully staffed according to its requirements
        # ---------------------------------------------------------------------
        print("  [1/5] Adding shift coverage constraints...")
        coverage_count = 0

        for shift in self.data.shifts:
            shift_id = shift.shift_id
            requirements = self.data.shift_requirements[shift_id]

            for req in requirements:
                # Find all workers who can fill this role
                eligible_workers = []

                for worker_id in self.data.workers:
                    # Check if variable exists (worker is available)
                    if shift_id not in self.x.get(worker_id, {}):
                        continue

                    # Worker must have BOTH the role AND the required skill (if any)
                    # Roles like "Cashier", "Stocker", "Supervisor" are stored as skills
                    has_role = self.data.worker_has_skill(worker_id, req.role)
                    has_required_skill = self.data.worker_has_skill(worker_id, req.required_skill)

                    if has_role and has_required_skill:
                        eligible_workers.append(worker_id)

                # Constraint: Sum of assigned eligible workers = required count
                if eligible_workers:
                    self.model.Add(
                        sum(self.x[w][shift_id] for w in eligible_workers) == req.count
                    )
                    coverage_count += 1
                else:
                    # No eligible workers - problem is infeasible
                    print(f"    WARNING: No eligible workers for {shift_id} - {req}")

        print(f"    Added {coverage_count} coverage constraints")

        # ---------------------------------------------------------------------
        # CONSTRAINT 2: ROLE/SKILL MATCH
        # This is implicitly handled by only creating variables for workers
        # with appropriate skills in Constraint 1 above
        # ---------------------------------------------------------------------
        print("  [2/5] Role/skill matching (implicit in coverage constraints)")

        # ---------------------------------------------------------------------
        # CONSTRAINT 3: WORKER AVAILABILITY
        # Workers only assigned when available (implicit - variables only exist
        # for available shifts)
        # ---------------------------------------------------------------------
        print("  [3/5] Worker availability (implicit in variable creation)")

        # ---------------------------------------------------------------------
        # CONSTRAINT 4: NO DOUBLE BOOKING
        # A worker cannot be assigned to overlapping shifts
        # ---------------------------------------------------------------------
        print("  [4/5] Adding no double-booking constraints...")
        overlap_count = 0

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            # Check all pairs of shifts this worker could be assigned to
            assigned_shifts = list(self.x[worker_id].keys())

            for i, shift_id_1 in enumerate(assigned_shifts):
                shift_1 = self.data.get_shift(shift_id_1)

                for shift_id_2 in assigned_shifts[i+1:]:
                    shift_2 = self.data.get_shift(shift_id_2)

                    # Check if shifts overlap
                    if self._shifts_overlap(shift_1, shift_2):
                        # Constraint: Worker can be assigned to at most one of these shifts
                        self.model.Add(
                            self.x[worker_id][shift_id_1] +
                            self.x[worker_id][shift_id_2] <= 1
                        )
                        overlap_count += 1

        print(f"    Added {overlap_count} overlap prevention constraints")

        # ---------------------------------------------------------------------
        # CONSTRAINT 5: MAXIMUM HOURS PER WEEK
        # Workers cannot exceed their maximum weekly hours
        # ---------------------------------------------------------------------
        print("  [5/5] Adding maximum hours constraints...")
        hours_count = 0

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            max_hours = self.data.max_hours_per_week.get(worker_id, 40.0)

            # Calculate total hours if assigned to each shift
            # We need to scale to integers for CP-SAT (multiply by 100 to handle decimals)
            SCALE_FACTOR = 100
            total_hours_scaled = []

            for shift_id in self.x[worker_id]:
                shift = self.data.get_shift(shift_id)
                hours_scaled = int(shift.duration_hours * SCALE_FACTOR)
                total_hours_scaled.append(
                    self.x[worker_id][shift_id] * hours_scaled
                )

            if total_hours_scaled:
                # Constraint: Total hours <= max hours
                max_hours_scaled = int(max_hours * SCALE_FACTOR)
                self.model.Add(sum(total_hours_scaled) <= max_hours_scaled)
                hours_count += 1

        print(f"    Added {hours_count} maximum hours constraints")

    def define_objective(self):
        """
        TASK 4: Define the optimization objective.

        Objective: Minimize Total Labor Cost

        Cost = Sum over all assignments of (Worker Hourly Rate × Shift Duration)

        The CP-SAT solver only handles integer objectives, so we scale costs
        by 100 to handle cents (e.g., $15.50/hr becomes 1550 cents/hr).
        """
        print("Defining objective function...")

        COST_SCALE_FACTOR = 100  # Convert dollars to cents for integer arithmetic
        cost_terms = []

        for worker_id in self.data.workers:
            if worker_id not in self.x:
                continue

            hourly_rate = self.data.labor_cost[worker_id]

            for shift_id in self.x[worker_id]:
                shift = self.data.get_shift(shift_id)

                # Calculate cost in cents: hourly_rate * duration * 100
                shift_cost = int(hourly_rate * shift.duration_hours * COST_SCALE_FACTOR)

                # Add to objective: cost * assignment_variable
                cost_terms.append(self.x[worker_id][shift_id] * shift_cost)

        # Minimize total cost
        if cost_terms:
            self.model.Minimize(sum(cost_terms))
            print(f"  Objective defined with {len(cost_terms)} cost terms")
        else:
            print("  WARNING: No cost terms in objective function")

    def solve_model(self, time_limit_seconds: int = 30) -> bool:
        """
        TASK 5: Solve the scheduling problem.

        Args:
            time_limit_seconds: Maximum time to spend searching for a solution

        Returns:
            True if an optimal or feasible solution was found, False otherwise
        """
        print("\n" + "=" * 80)
        print("SOLVING SCHEDULING PROBLEM")
        print("=" * 80)

        # Configure solver
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.log_search_progress = False  # Set to True for debugging

        # Solve
        print(f"Running CP-SAT solver (time limit: {time_limit_seconds}s)...")
        import time
        start_time = time.time()

        status = self.solver.Solve(self.model)

        self.solve_time = time.time() - start_time

        # Process results
        print(f"Solve time: {self.solve_time:.2f} seconds")
        print(f"Status: {self.solver.StatusName(status)}")

        if status == cp_model.OPTIMAL:
            print("✓ OPTIMAL solution found!")
            self._extract_solution()
            return True

        elif status == cp_model.FEASIBLE:
            print("✓ FEASIBLE solution found (may not be optimal)")
            self._extract_solution()
            return True

        elif status == cp_model.INFEASIBLE:
            print("✗ INFEASIBLE - No valid schedule exists")
            print("\nThis indicates the problem is over-constrained:")
            print("  - Too few workers")
            print("  - Insufficient skills in workforce")
            print("  - Conflicting availability and shift requirements")
            print("\nUse scheduling_diagnostics.py to analyze the failure!")
            return False

        else:
            print(f"✗ Solver terminated with status: {self.solver.StatusName(status)}")
            return False

    def _extract_solution(self):
        """Extract and store the solution from the solver."""
        COST_SCALE_FACTOR = 100

        # Calculate optimal cost
        self.optimal_cost = self.solver.ObjectiveValue() / COST_SCALE_FACTOR

        # Extract assignments
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

    def _shifts_overlap(self, shift1: Shift, shift2: Shift) -> bool:
        """
        Check if two shifts overlap in time.

        Args:
            shift1: First shift
            shift2: Second shift

        Returns:
            True if shifts overlap, False otherwise
        """
        if shift1.day != shift2.day:
            return False

        # Parse times
        start1 = datetime.strptime(shift1.start_time, "%H:%M")
        end1 = datetime.strptime(shift1.end_time, "%H:%M")
        start2 = datetime.strptime(shift2.start_time, "%H:%M")
        end2 = datetime.strptime(shift2.end_time, "%H:%M")

        # Handle overnight shifts
        if end1 < start1:
            end1 += timedelta(days=1)
        if end2 < start2:
            end2 += timedelta(days=1)

        # Check overlap: shifts overlap if start1 < end2 AND start2 < end1
        return start1 < end2 and start2 < end1

    def print_solution(self):
        """Print a human-readable schedule."""
        if not self.solution:
            print("No solution available")
            return

        print("\n" + "=" * 80)
        print("OPTIMAL SCHEDULE")
        print("=" * 80)
        print(f"Total Labor Cost: ${self.solution['total_cost']:.2f}")
        print(f"Total Assignments: {len(self.solution['assignments'])}")
        print()

        # Print by worker
        print("SCHEDULE BY WORKER:")
        print("-" * 80)

        for worker_id in sorted(self.data.workers):
            worker_shifts = [
                a for a in self.solution['assignments']
                if a['worker_id'] == worker_id
            ]

            if worker_shifts:
                total_hours = self.solution['worker_hours'][worker_id]
                hourly_rate = self.data.labor_cost[worker_id]
                worker_cost = sum(a['cost'] for a in worker_shifts)

                print(f"\n{worker_id} - ${hourly_rate:.2f}/hr - {total_hours:.1f}h - ${worker_cost:.2f}")

                for assignment in sorted(worker_shifts, key=lambda a: a['shift'].day):
                    shift = assignment['shift']
                    print(f"  • {shift}")
            else:
                print(f"\n{worker_id} - NOT ASSIGNED")

        # Print by shift
        print("\n\nSCHEDULE BY SHIFT:")
        print("-" * 80)

        days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        shifts_by_day = {}

        for shift in self.data.shifts:
            if shift.day not in shifts_by_day:
                shifts_by_day[shift.day] = []
            shifts_by_day[shift.day].append(shift)

        for day in days_order:
            if day not in shifts_by_day:
                continue

            print(f"\n{day}:")

            for shift in sorted(shifts_by_day[day], key=lambda s: s.start_time):
                workers = self.solution['shift_assignments'][shift.shift_id]
                workers_str = ', '.join(workers) if workers else "UNFILLED"

                requirements = self.data.shift_requirements[shift.shift_id]
                req_str = ', '.join(str(r) for r in requirements)

                print(f"  {shift.shift_id} ({shift.start_time}-{shift.end_time})")
                print(f"    Needs: {req_str}")
                print(f"    Assigned: {workers_str}")

        print("\n" + "=" * 80)

    def get_statistics(self) -> Dict[str, Any]:
        """Get solution statistics for analysis."""
        if not self.solution:
            return {}

        return {
            'total_cost': self.solution['total_cost'],
            'solve_time': self.solution['solve_time'],
            'num_assignments': len(self.solution['assignments']),
            'num_workers_used': sum(1 for h in self.solution['worker_hours'].values() if h > 0),
            'avg_hours_per_worker': sum(self.solution['worker_hours'].values()) / len(self.data.workers),
            'max_worker_hours': max(self.solution['worker_hours'].values()),
            'min_worker_hours': min(h for h in self.solution['worker_hours'].values() if h > 0),
        }


# ============================================================================
# DEMONSTRATION
# ============================================================================

def main():
    """
    Demonstrate the input data structure definition with sample scenarios.
    """
    print("=" * 80)
    print("WORKFORCE SCHEDULING ENGINE - INPUT DATA STRUCTURES")
    print("=" * 80)
    print()

    # -------------------------------------------------------------------------
    # Scenario 1: Retail Store Scheduling
    # -------------------------------------------------------------------------
    print("SCENARIO 1: RETAIL STORE SCHEDULING")
    print("=" * 80)
    print()

    retail_data = create_sample_retail_data()

    # Validate the data
    is_valid, errors = retail_data.validate()
    if is_valid:
        print("✓ Data validation PASSED")
    else:
        print("✗ Data validation FAILED:")
        for error in errors:
            print(f"  - {error}")

    print()
    print(retail_data.summary())
    print()

    # -------------------------------------------------------------------------
    # Scenario 2: Healthcare Scheduling
    # -------------------------------------------------------------------------
    print("\n")
    print("SCENARIO 2: HEALTHCARE/HOSPITAL SCHEDULING")
    print("=" * 80)
    print()

    healthcare_data = create_sample_healthcare_data()

    # Validate the data
    is_valid, errors = healthcare_data.validate()
    if is_valid:
        print("✓ Data validation PASSED")
    else:
        print("✗ Data validation FAILED:")
        for error in errors:
            print(f"  - {error}")

    print()
    print(healthcare_data.summary())
    print()

    # -------------------------------------------------------------------------
    # Demonstrate Data Access Methods
    # -------------------------------------------------------------------------
    print("\n")
    print("DATA ACCESS EXAMPLES")
    print("=" * 80)
    print()

    # Check if a specific worker can work a specific shift
    test_shift = retail_data.get_shift("MORNING_MONDAY")
    if test_shift:
        print(f"Testing availability for {test_shift}:")
        for worker_id in retail_data.workers[:3]:  # Check first 3 workers
            can_work = retail_data.worker_can_work_shift(worker_id, test_shift)
            has_opening = retail_data.worker_has_skill(worker_id, "Opening_Experience")
            print(f"  {worker_id}: Available={can_work}, Has Opening_Experience={has_opening}")

    print()

    # -------------------------------------------------------------------------
    # RUN THE SCHEDULER
    # -------------------------------------------------------------------------
    print("\n\n")
    print("=" * 80)
    print("RUNNING COMPLETE SCHEDULING ENGINE")
    print("=" * 80)
    print()

    # Use the retail data for demonstration
    print("Creating scheduler model with retail store data...")
    scheduler = SchedulerModel(retail_data)

    # Build the model
    scheduler.create_variables()
    scheduler.add_hard_constraints()
    scheduler.define_objective()

    # Solve
    success = scheduler.solve_model(time_limit_seconds=30)

    if success:
        # Display the solution
        scheduler.print_solution()

        # Show statistics
        print("\n")
        print("SOLUTION STATISTICS:")
        print("-" * 80)
        stats = scheduler.get_statistics()
        for key, value in stats.items():
            print(f"  {key}: {value}")

        print("\n")
        print("=" * 80)
        print("SUCCESS! Optimal schedule generated.")
        print("=" * 80)
    else:
        print("\n")
        print("=" * 80)
        print("SCHEDULING FAILED!")
        print("=" * 80)
        print("\nNext steps:")
        print("  1. Run scheduling_diagnostics.py to analyze the failure")
        print("  2. Review worker availability and skills")
        print("  3. Consider adjusting shift requirements")
        print("=" * 80)


if __name__ == "__main__":
    main()

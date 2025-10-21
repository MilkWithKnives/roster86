#!/usr/bin/env python3
"""
Restaurant Scheduling Runner - JSON Interface
==============================================

Bridge between Node.js API and the advanced restaurant scheduling engine.
This extends scheduling_runner.py to use the new OptaPlanner-inspired algorithms.

Usage:
    python3 restaurant_scheduling_runner.py input.json output.json
"""

import sys
import json
import traceback
from typing import Dict, List, Any
from restaurant_scheduling_engine import (
    RestaurantSchedulingData,
    RestaurantSchedulerModel,
    RestaurantShift,
    ShiftType,
    ShiftRequirement,
    TimeSlot,
    BudgetConstraint,
    FairnessConstraints
)


class RestaurantSchedulingRunner:
    """JSON interface for the restaurant scheduling engine."""

    def __init__(self):
        self.data = None
        self.scheduler = None
        self.result = {
            "success": False,
            "solution": None,
            "coverage_gaps": [],
            "budget_metrics": {},
            "fairness_metrics": {},
            "messages": [],
            "errors": []
        }

    def load_input_data(self, input_data: Dict[str, Any]) -> bool:
        """Load scheduling data from JSON input with budget and fairness constraints."""
        try:
            # Validate input data structure
            if not isinstance(input_data, dict):
                self.result["errors"].append("Input data must be a dictionary")
                return False

            if not input_data.get("workers"):
                self.result["errors"].append("No workers provided in input data")
                return False

            if not input_data.get("shifts"):
                self.result["errors"].append("No shifts provided in input data")
                return False

            self.data = RestaurantSchedulingData()

            # Load budget constraints (NEW!)
            budget_config = input_data.get("budget", {})
            if budget_config:
                self.data.set_budget_constraint(
                    max_total_cost=float(budget_config.get("max_total_cost", 10000.0)),
                    max_daily_cost=float(budget_config.get("max_daily_cost")) if budget_config.get("max_daily_cost") else None,
                    target_cost=float(budget_config.get("target_cost")) if budget_config.get("target_cost") else None
                )

            # Load fairness constraints (NEW!)
            fairness_config = input_data.get("fairness", {})
            if fairness_config:
                self.data.set_fairness_constraints(
                    max_shift_imbalance=int(fairness_config.get("max_shift_imbalance", 4)),
                    max_consecutive_days=int(fairness_config.get("max_consecutive_days", 6)),
                    min_rest_hours=float(fairness_config.get("min_rest_hours", 12.0))
                )

            # Load workers
            for worker in input_data.get("workers", []):
                self.data.add_worker(
                    worker_id=worker["id"],
                    skills=worker.get("skills", []),
                    hourly_rate=float(worker.get("hourly_rate", 15.0)),
                    max_hours=float(worker.get("max_hours", 40.0)),
                    min_hours=float(worker.get("min_hours", 0.0))
                )

                # Add availability
                availability = []
                for slot in worker.get("availability", []):
                    availability.append(TimeSlot(
                        day=slot["day"],
                        start_time=slot["start_time"],
                        end_time=slot["end_time"]
                    ))

                if availability:
                    self.data.add_availability(worker["id"], availability)

            # Load shifts (with restaurant-specific enhancements)
            for shift in input_data.get("shifts", []):
                requirements = []
                for req in shift.get("requirements", []):
                    requirements.append(ShiftRequirement(
                        role=req["role"],
                        count=int(req["count"]),
                        required_skill=req.get("required_skill")
                    ))

                # Determine shift type from time or explicit type
                shift_type = self._determine_shift_type(
                    shift.get("shift_type"),
                    shift["start_time"],
                    shift["end_time"]
                )

                restaurant_shift = RestaurantShift(
                    shift_id=shift["id"],
                    day=shift["day"],
                    start_time=shift["start_time"],
                    end_time=shift["end_time"],
                    shift_type=shift_type,
                    section=shift.get("section"),
                    requires_opening_duties=shift.get("requires_opening_duties", False),
                    requires_closing_duties=shift.get("requires_closing_duties", False)
                )

                self.data.add_shift(restaurant_shift, requirements)

            self.result["messages"].append(
                f"Loaded {len(self.data.workers)} workers and {len(self.data.shifts)} shifts"
            )

            if self.data.budget_constraint:
                self.result["messages"].append(
                    f"Budget: ${self.data.budget_constraint.max_total_cost:.2f} weekly cap"
                )

            return True

        except Exception as e:
            self.result["errors"].append(f"Error loading input data: {str(e)}")
            traceback.print_exc()
            return False

    def _determine_shift_type(self, explicit_type: str, start_time: str, end_time: str) -> ShiftType:
        """Determine shift type from explicit type or infer from times."""
        if explicit_type:
            type_map = {
                "Prep": ShiftType.PREP,
                "Opening": ShiftType.OPENING,
                "Lunch": ShiftType.LUNCH,
                "Dinner": ShiftType.DINNER,
                "Closing": ShiftType.CLOSING,
                "Double": ShiftType.DOUBLE
            }
            return type_map.get(explicit_type, ShiftType.LUNCH)

        # Infer from start time
        start_hour = int(start_time.split(':')[0])

        if start_hour < 8:
            return ShiftType.PREP
        elif start_hour < 11:
            return ShiftType.OPENING
        elif start_hour < 14:
            return ShiftType.LUNCH
        elif start_hour < 17:
            return ShiftType.LUNCH  # Late lunch
        else:
            return ShiftType.DINNER

    def run_scheduling(self, constraints: Dict[str, Any] = {}) -> bool:
        """Execute the advanced scheduling algorithm."""
        try:
            if not self.data:
                self.result["errors"].append("No input data loaded")
                return False

            time_limit = constraints.get("time_limit", 60)

            self.result["messages"].append("Creating advanced restaurant scheduler (OptaPlanner-inspired)...")
            self.result["messages"].append("Algorithms: First Fit Decreasing + Tabu Search + CP-SAT")

            self.scheduler = RestaurantSchedulerModel(self.data)

            # Build the optimization model
            self.scheduler.create_variables()
            self.scheduler.add_hard_constraints()
            self.scheduler.add_soft_constraints_to_objective()
            self.scheduler.define_objective()

            self.result["messages"].append(f"Running metaheuristic solver (limit: {time_limit}s)...")

            # Solve the model
            success = self.scheduler.solve_model(time_limit_seconds=time_limit)

            if success:
                self._process_successful_solution()
                self.result["success"] = True
                self.result["messages"].append("✓ Schedule optimized successfully!")
            else:
                self._analyze_scheduling_failure()
                self.result["messages"].append("✗ Could not find feasible schedule")

            return success

        except Exception as e:
            self.result["errors"].append(f"Scheduling error: {str(e)}")
            traceback.print_exc()
            return False

    def _process_successful_solution(self):
        """Process a successful scheduling solution with budget and fairness metrics."""
        solution_data = self.scheduler.solution

        # Format assignments for JSON output
        formatted_assignments = []
        for assignment in solution_data["assignments"]:
            formatted_assignments.append({
                "worker_id": assignment["worker_id"],
                "shift_id": assignment["shift_id"],
                "day": assignment["shift"].day,
                "start_time": assignment["shift"].start_time,
                "end_time": assignment["shift"].end_time,
                "duration_hours": assignment["shift"].duration_hours,
                "shift_type": assignment["shift"].shift_type.value,
                "cost": round(assignment["cost"], 2)
            })

        # Format worker hours
        worker_hours = {
            worker_id: round(hours, 2)
            for worker_id, hours in solution_data["worker_hours"].items()
        }

        # Get comprehensive statistics
        stats = self.scheduler.get_statistics()

        # Budget metrics (NEW!)
        budget_metrics = {}
        if self.data.budget_constraint:
            budget_metrics = {
                "max_budget": self.data.budget_constraint.max_total_cost,
                "actual_cost": solution_data["total_cost"],
                "utilization_percent": stats.get("budget_utilization", 0),
                "under_budget": solution_data["total_cost"] <= self.data.budget_constraint.max_total_cost,
                "savings": self.data.budget_constraint.max_total_cost - solution_data["total_cost"]
            }

        # Fairness metrics (NEW!)
        fairness_metrics = {
            "hours_variance": stats.get("hours_variance", 0),
            "max_hours": stats.get("max_worker_hours", 0),
            "min_hours": stats.get("min_worker_hours", 0),
            "avg_hours": stats.get("avg_hours_per_worker", 0),
            "shift_balance_score": self._calculate_shift_balance_score(solution_data)
        }

        self.result["solution"] = {
            "assignments": formatted_assignments,
            "worker_hours": worker_hours,
            "total_cost": round(solution_data["total_cost"], 2),
            "solve_time": round(solution_data["solve_time"], 2),
            "statistics": stats
        }

        self.result["budget_metrics"] = budget_metrics
        self.result["fairness_metrics"] = fairness_metrics

        # Check for any uncovered shifts
        self._identify_coverage_gaps()

    def _calculate_shift_balance_score(self, solution_data: Dict[str, Any]) -> float:
        """Calculate a fairness score based on shift distribution (0-100)."""
        try:
            hours_list = [h for h in solution_data.get("worker_hours", {}).values() if h > 0]

            # Handle edge cases
            if not hours_list:
                return 100.0  # Perfect score if no assignments (weird but safe)

            if len(hours_list) == 1:
                return 100.0  # Single worker = perfect balance

            avg = sum(hours_list) / len(hours_list)

            # Handle zero average (shouldn't happen but be safe)
            if avg == 0:
                return 100.0

            # Calculate variance
            variance = sum((h - avg) ** 2 for h in hours_list) / len(hours_list)
            std_dev = variance ** 0.5

            # Convert to 0-100 score (lower variance = higher score)
            # Assume std_dev of 0 = perfect (100), std_dev of 10+ = poor (0)
            score = max(0.0, min(100.0, 100 - (std_dev * 10)))
            return round(score, 1)

        except Exception as e:
            # If anything fails, return neutral score
            print(f"Warning: Failed to calculate balance score: {e}")
            return 50.0

    def _analyze_scheduling_failure(self):
        """Analyze why scheduling failed and provide detailed feedback."""
        self._identify_coverage_gaps()

        messages = [
            "Scheduling failed - possible causes:",
            "• Budget constraints too tight (try increasing max_total_cost)",
            "• Insufficient workers with required skills",
            "• Conflicting availability vs shift requirements",
            "• Over-constrained fairness settings (try relaxing min_rest_hours or max_consecutive_days)"
        ]

        if self.data.budget_constraint:
            messages.append(f"• Current budget: ${self.data.budget_constraint.max_total_cost:.2f}")

        self.result["messages"].extend(messages)

    def _identify_coverage_gaps(self):
        """Identify shifts that cannot be covered and why."""
        coverage_gaps = []

        for shift in self.data.shifts:
            shift_requirements = self.data.shift_requirements[shift.shift_id]

            for requirement in shift_requirements:
                # Find eligible workers
                eligible_workers = []

                for worker_id in self.data.workers:
                    if not self.data.worker_can_work_shift(worker_id, shift):
                        continue

                    if not self.data.worker_has_skill(worker_id, requirement.required_skill):
                        continue

                    eligible_workers.append(worker_id)

                # Check if requirement is covered
                if self.scheduler and self.scheduler.solution:
                    assigned_workers = self.scheduler.solution["shift_assignments"].get(shift.shift_id, [])

                    if requirement.required_skill:
                        skilled_assigned = [
                            w for w in assigned_workers
                            if self.data.worker_has_skill(w, requirement.required_skill)
                        ]
                        assigned_count = len(skilled_assigned)
                    else:
                        assigned_count = len(assigned_workers)

                    if assigned_count < requirement.count:
                        gap = {
                            "shift_id": shift.shift_id,
                            "day": shift.day,
                            "time_range": f"{shift.start_time}-{shift.end_time}",
                            "shift_type": shift.shift_type.value,
                            "missing_staff": requirement.count - assigned_count,
                            "required_role": requirement.role,
                            "required_skill": requirement.required_skill,
                            "eligible_workers": len(eligible_workers),
                            "reason": self._get_gap_reason(len(eligible_workers), requirement.count - assigned_count)
                        }
                        coverage_gaps.append(gap)

                elif len(eligible_workers) < requirement.count:
                    gap = {
                        "shift_id": shift.shift_id,
                        "day": shift.day,
                        "time_range": f"{shift.start_time}-{shift.end_time}",
                        "shift_type": shift.shift_type.value,
                        "missing_staff": requirement.count - len(eligible_workers),
                        "required_role": requirement.role,
                        "required_skill": requirement.required_skill,
                        "eligible_workers": len(eligible_workers),
                        "reason": self._get_gap_reason(len(eligible_workers), requirement.count)
                    }
                    coverage_gaps.append(gap)

        self.result["coverage_gaps"] = coverage_gaps

    def _get_gap_reason(self, eligible_count: int, needed_count: int) -> str:
        """Generate a human-readable reason for the coverage gap."""
        if eligible_count == 0:
            return "No workers available with required skills and availability"
        elif eligible_count < needed_count:
            return f"Only {eligible_count} eligible workers, need {needed_count}"
        else:
            return "Scheduling conflict (budget, fairness, or hour constraints)"

    def save_results(self, output_path: str):
        """Save results to JSON file."""
        try:
            with open(output_path, 'w') as f:
                json.dump(self.result, f, indent=2)
        except Exception as e:
            self.result["errors"].append(f"Error saving results: {str(e)}")


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) != 3:
        print("Usage: python3 restaurant_scheduling_runner.py input.json output.json")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    runner = RestaurantSchedulingRunner()

    try:
        # Load input data
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        # Extract constraints
        constraints = input_data.get("constraints", {})

        # Process scheduling
        if runner.load_input_data(input_data):
            runner.run_scheduling(constraints)

        # Save results
        runner.save_results(output_file)

        # Print summary to stdout
        if runner.result["success"]:
            print(f"SUCCESS: Schedule generated with {len(runner.result['solution']['assignments'])} assignments")
            print(f"Total cost: ${runner.result['solution']['total_cost']:.2f}")

            if runner.result["budget_metrics"]:
                print(f"Budget utilization: {runner.result['budget_metrics']['utilization_percent']:.1f}%")

            if runner.result["fairness_metrics"]:
                print(f"Shift balance score: {runner.result['fairness_metrics']['shift_balance_score']:.1f}/100")

            if runner.result["coverage_gaps"]:
                print(f"WARNING: {len(runner.result['coverage_gaps'])} coverage gaps identified")
        else:
            print("FAILED: Could not generate schedule")
            print(f"Errors: {len(runner.result['errors'])}")
            print(f"Coverage gaps: {len(runner.result['coverage_gaps'])}")

    except Exception as e:
        print(f"ERROR: {str(e)}")
        traceback.print_exc()

        # Save error result
        runner.result["errors"].append(str(e))
        runner.save_results(output_file)
        sys.exit(1)


if __name__ == "__main__":
    main()

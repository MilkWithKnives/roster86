#!/usr/bin/env python3
"""
Scheduling Runner - JSON Interface for Workforce Scheduling Engine
================================================================

This script provides a JSON interface to the workforce scheduling engine,
allowing Node.js to execute scheduling operations and receive structured results.

Usage:
    python scheduling_runner.py input.json output.json

Input JSON format:
{
    "workers": [
        {
            "id": "W001",
            "skills": ["Cashier", "Opening"],
            "hourly_rate": 18.50,
            "max_hours": 40,
            "availability": [
                {"day": "Monday", "start_time": "06:00", "end_time": "18:00"}
            ]
        }
    ],
    "shifts": [
        {
            "id": "SHIFT_001",
            "day": "Monday",
            "start_time": "08:00",
            "end_time": "16:00",
            "requirements": [
                {"role": "Cashier", "count": 2, "required_skill": null}
            ]
        }
    ]
}

Output JSON format:
{
    "success": true,
    "solution": {
        "assignments": [...],
        "total_cost": 1250.50,
        "solve_time": 2.35,
        "statistics": {...}
    },
    "coverage_gaps": [
        {
            "shift_id": "SHIFT_002",
            "day": "Tuesday",
            "time_range": "14:00-22:00",
            "missing_staff": 1,
            "required_skill": "Supervisor"
        }
    ],
    "messages": ["Schedule generated successfully"]
}
"""

import sys
import json
import traceback
from typing import Dict, List, Any
from workforce_scheduling_engine import (
    SchedulingInputData, 
    SchedulerModel,
    Shift,
    ShiftRequirement,
    TimeSlot
)

class SchedulingRunner:
    """JSON interface for the scheduling engine."""
    
    def __init__(self):
        self.data = None
        self.scheduler = None
        self.result = {
            "success": False,
            "solution": None,
            "coverage_gaps": [],
            "messages": [],
            "errors": []
        }

    def load_input_data(self, input_data: Dict[str, Any]) -> bool:
        """Load scheduling data from JSON input."""
        try:
            self.data = SchedulingInputData()
            
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
            
            # Load shifts
            for shift in input_data.get("shifts", []):
                requirements = []
                for req in shift.get("requirements", []):
                    requirements.append(ShiftRequirement(
                        role=req["role"],
                        count=int(req["count"]),
                        required_skill=req.get("required_skill")
                    ))
                
                self.data.add_shift(
                    shift_id=shift["id"],
                    day=shift["day"],
                    start_time=shift["start_time"],
                    end_time=shift["end_time"],
                    requirements=requirements
                )
            
            # Validate data
            is_valid, errors = self.data.validate()
            if not is_valid:
                self.result["errors"].extend(errors)
                return False
            
            self.result["messages"].append(f"Loaded {len(self.data.workers)} workers and {len(self.data.shifts)} shifts")
            return True
            
        except Exception as e:
            self.result["errors"].append(f"Error loading input data: {str(e)}")
            return False

    def run_scheduling(self, time_limit: int = 30) -> bool:
        """Execute the scheduling algorithm."""
        try:
            if not self.data:
                self.result["errors"].append("No input data loaded")
                return False
            
            self.result["messages"].append("Creating scheduling model...")
            self.scheduler = SchedulerModel(self.data)
            
            # Build the optimization model
            self.scheduler.create_variables()
            self.scheduler.add_hard_constraints()
            self.scheduler.define_objective()
            
            self.result["messages"].append(f"Running solver with {time_limit}s time limit...")
            
            # Solve the model
            success = self.scheduler.solve_model(time_limit_seconds=time_limit)
            
            if success:
                self._process_successful_solution()
                self.result["success"] = True
                self.result["messages"].append("Schedule generated successfully!")
            else:
                self._analyze_scheduling_failure()
                self.result["messages"].append("Could not find feasible schedule")
            
            return success
            
        except Exception as e:
            self.result["errors"].append(f"Scheduling error: {str(e)}")
            return False

    def _process_successful_solution(self):
        """Process a successful scheduling solution."""
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
                "cost": round(assignment["cost"], 2)
            })
        
        # Format worker hours
        worker_hours = {
            worker_id: round(hours, 2)
            for worker_id, hours in solution_data["worker_hours"].items()
        }
        
        self.result["solution"] = {
            "assignments": formatted_assignments,
            "worker_hours": worker_hours,
            "total_cost": round(solution_data["total_cost"], 2),
            "solve_time": round(solution_data["solve_time"], 2),
            "statistics": self.scheduler.get_statistics()
        }
        
        # Check for any uncovered shifts
        self._identify_coverage_gaps()

    def _analyze_scheduling_failure(self):
        """Analyze why scheduling failed and provide detailed feedback."""
        # Identify potential coverage gaps by checking which shifts have no viable workers
        self._identify_coverage_gaps()
        
        # Add diagnostic information
        self.result["messages"].extend([
            "Scheduling failed - possible causes:",
            "• Insufficient workers with required skills",
            "• Conflicting availability vs shift requirements", 
            "• Over-constrained maximum hours limits",
            "• Incompatible shift time overlaps"
        ])

    def _identify_coverage_gaps(self):
        """Identify shifts that cannot be covered and why."""
        coverage_gaps = []
        
        for shift in self.data.shifts:
            shift_requirements = self.data.shift_requirements[shift.shift_id]
            
            for requirement in shift_requirements:
                # Find workers who can work this shift and have required skills
                eligible_workers = []
                
                for worker_id in self.data.workers:
                    # Check availability
                    if not self.data.worker_can_work_shift(worker_id, shift):
                        continue
                    
                    # Check skills
                    if not self.data.worker_has_skill(worker_id, requirement.required_skill):
                        continue
                    
                    eligible_workers.append(worker_id)
                
                # If we have a solution, check if this requirement is actually covered
                if self.scheduler and self.scheduler.solution:
                    assigned_workers = self.scheduler.solution["shift_assignments"].get(shift.shift_id, [])
                    # Filter by skill requirement if needed
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
                            "missing_staff": requirement.count - assigned_count,
                            "required_role": requirement.role,
                            "required_skill": requirement.required_skill,
                            "eligible_workers": len(eligible_workers),
                            "reason": self._get_gap_reason(len(eligible_workers), requirement.count - assigned_count)
                        }
                        coverage_gaps.append(gap)
                
                # If no solution, check if there are enough eligible workers
                elif len(eligible_workers) < requirement.count:
                    gap = {
                        "shift_id": shift.shift_id,
                        "day": shift.day,
                        "time_range": f"{shift.start_time}-{shift.end_time}",
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
            return "Scheduling conflict with other constraints"

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
        print("Usage: python scheduling_runner.py input.json output.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    runner = SchedulingRunner()
    
    try:
        # Load input data
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        # Process scheduling
        if runner.load_input_data(input_data):
            runner.run_scheduling(time_limit=60)  # Allow more time for complex schedules
        
        # Save results
        runner.save_results(output_file)
        
        # Print summary to stdout
        if runner.result["success"]:
            print(f"SUCCESS: Schedule generated with {len(runner.result['solution']['assignments'])} assignments")
            print(f"Total cost: ${runner.result['solution']['total_cost']:.2f}")
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
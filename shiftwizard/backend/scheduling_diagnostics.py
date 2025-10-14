"""
Scheduling Diagnostic System
=============================

A modular framework for analyzing Constraint Programming (CP) solver failures
in employee scheduling scenarios. This system provides separate diagnostic
and recommendation engines to identify root causes and suggest actionable fixes.

Architecture:
- Input Data Classes: Represent raw CP solver output
- DiagnosticEngine: Analyzes failures and generates structured summaries
- RecommendationEngine: Generates actionable recommendations (completely separate)

Author: Claude Code
Date: 2025-10-13
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


# ============================================================================
# TASK 1: INPUT DATA CLASSES
# ============================================================================

@dataclass
class ConstraintConflict:
    """
    Represents a primary hard constraint violation in the scheduling system.

    This is the core conflict that the CP solver could not resolve.
    Typically indicates that a shift cannot be adequately staffed.

    Attributes:
        shift_id: Unique identifier for the problematic shift
        role: The role/position that needs to be filled
        required_count: Number of workers needed for this role
        missing_skills: List of skills that are lacking in available workers
    """
    shift_id: str
    role: str
    required_count: int
    missing_skills: List[str]

    def __post_init__(self):
        """Validate the constraint conflict data."""
        if self.required_count < 0:
            raise ValueError("required_count must be non-negative")
        if not self.shift_id or not self.role:
            raise ValueError("shift_id and role must be non-empty")


@dataclass
class WorkerStatus:
    """
    Represents the availability and capability status of a worker in relation
    to a constraint conflict.

    This nested data structure helps identify why specific workers cannot
    be assigned to the problematic shift.

    Attributes:
        worker_id: Unique identifier for the worker
        is_available: Whether the worker is available during the shift time
        available_skills: List of skills this worker possesses
        conflict_reason: Brief explanation of why this worker can't be assigned
                        Examples: 'Not enough hours', 'Scheduled elsewhere',
                                'Missing certification', 'Time-off requested'
    """
    worker_id: str
    is_available: bool
    available_skills: List[str]
    conflict_reason: str

    def has_skill(self, skill: str) -> bool:
        """Check if worker has a specific skill."""
        return skill in self.available_skills

    def skill_gap(self, required_skills: List[str]) -> List[str]:
        """Return list of required skills this worker is missing."""
        return [skill for skill in required_skills if skill not in self.available_skills]


@dataclass
class PenaltyReport:
    """
    Represents non-critical soft constraint violations that contribute to
    scheduling quality but are not blocking.

    Soft constraints can be relaxed to potentially resolve hard constraints,
    though this reduces schedule quality.

    Attributes:
        soft_constraint_id: Identifier for the soft constraint
        penalty_score: Numeric score indicating severity (higher = worse)
        current_setting: Current configuration or threshold for this constraint
                        Examples: "max_consecutive_days: 5", "preferred_shift_length: 8h"
    """
    soft_constraint_id: str
    penalty_score: float
    current_setting: str

    def __post_init__(self):
        """Validate penalty data."""
        if self.penalty_score < 0:
            raise ValueError("penalty_score must be non-negative")


@dataclass
class CandidateMove:
    """
    Represents a pre-computed, low-impact worker reassignment that might
    help resolve the constraint conflict.

    The CP solver may generate these as potential solutions that were close
    to feasible but still violated some constraint.

    Attributes:
        worker_id: ID of worker to be moved
        source_shift_id: Current shift assignment
        target_shift_id: Proposed new shift assignment
        impact_score: Estimated disruption (lower is better)
        reason: Why this move might help
    """
    worker_id: str
    source_shift_id: str
    target_shift_id: str
    impact_score: float = 0.0
    reason: str = ""

    def __post_init__(self):
        """Validate move data."""
        if self.source_shift_id == self.target_shift_id:
            raise ValueError("source and target shifts must be different")


# ============================================================================
# TASK 2: DIAGNOSTIC ENGINE
# ============================================================================

class DiagnosticEngine:
    """
    Analyzes CP solver failure data to produce structured diagnostic summaries.

    This engine is completely separate from the recommendation system. Its sole
    responsibility is to analyze the raw constraint conflict data and produce
    a clear, structured summary of the problem.

    Key Responsibilities:
    - Calculate staffing gaps
    - Identify critical missing skills
    - Analyze worker availability patterns
    - Produce structured diagnostic output
    """

    def __init__(self):
        """Initialize the diagnostic engine."""
        self.last_analysis: Optional[Dict[str, Any]] = None

    def generate_summary(self, conflict_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a structured summary from raw CP solver failure data.

        This method analyzes the constraint conflict and associated worker
        statuses to produce a diagnostic summary that can drive downstream
        recommendation processes.

        Args:
            conflict_data: Dictionary containing:
                - 'conflict': ConstraintConflict instance
                - 'worker_statuses': List[WorkerStatus] instances

        Returns:
            Dictionary with structured diagnostic information:
                - shift_id: The problematic shift
                - role: The role that needs filling
                - staffing_gap: dict with 'needed' and 'available' counts
                - critical_missing_skill: The most important missing skill
                - available_workers_count: Total workers in the pool
                - unavailable_workers_count: Workers who can't be assigned
                - workers_by_reason: Breakdown of why workers are unavailable
                - closest_match_worker: Worker who most nearly meets requirements

        Raises:
            ValueError: If conflict_data is missing required keys
        """
        # Validate input structure
        if 'conflict' not in conflict_data or 'worker_statuses' not in conflict_data:
            raise ValueError("conflict_data must contain 'conflict' and 'worker_statuses' keys")

        conflict: ConstraintConflict = conflict_data['conflict']
        worker_statuses: List[WorkerStatus] = conflict_data['worker_statuses']

        # Calculate staffing gap
        available_workers = sum(1 for ws in worker_statuses if ws.is_available)
        staffing_gap = {
            'needed': conflict.required_count,
            'available': available_workers,
            'shortfall': max(0, conflict.required_count - available_workers)
        }

        # Identify the most critical missing skill
        # Count how many workers lack each required skill
        skill_gaps: Dict[str, int] = {}
        for skill in conflict.missing_skills:
            workers_lacking = sum(
                1 for ws in worker_statuses
                if not ws.has_skill(skill)
            )
            skill_gaps[skill] = workers_lacking

        critical_missing_skill = max(skill_gaps.items(), key=lambda x: x[1])[0] if skill_gaps else None

        # Analyze worker unavailability patterns
        workers_by_reason: Dict[str, List[str]] = {}
        for ws in worker_statuses:
            if not ws.is_available:
                reason = ws.conflict_reason
                if reason not in workers_by_reason:
                    workers_by_reason[reason] = []
                workers_by_reason[reason].append(ws.worker_id)

        # Find the worker who most nearly meets requirements (closest match)
        closest_match_worker = self._find_closest_match(
            worker_statuses,
            conflict.missing_skills
        )

        # Build structured summary
        summary = {
            'shift_id': conflict.shift_id,
            'role': conflict.role,
            'staffing_gap': staffing_gap,
            'critical_missing_skill': critical_missing_skill,
            'all_missing_skills': conflict.missing_skills,
            'available_workers_count': available_workers,
            'unavailable_workers_count': len(worker_statuses) - available_workers,
            'total_workers_in_pool': len(worker_statuses),
            'workers_by_reason': workers_by_reason,
            'closest_match_worker': closest_match_worker,
            'diagnosis_timestamp': self._get_timestamp()
        }

        # Store for potential debugging
        self.last_analysis = summary

        return summary

    def _find_closest_match(
        self,
        worker_statuses: List[WorkerStatus],
        required_skills: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Identify the worker who is closest to having all required skills.

        Args:
            worker_statuses: List of worker status objects
            required_skills: Skills needed for the shift

        Returns:
            Dictionary with worker_id, matching_skills count, and missing_skills list
            Returns None if no workers exist
        """
        if not worker_statuses or not required_skills:
            return None

        best_match = None
        best_match_count = -1

        for ws in worker_statuses:
            matching_count = sum(1 for skill in required_skills if ws.has_skill(skill))

            if matching_count > best_match_count:
                best_match_count = matching_count
                missing_skills = ws.skill_gap(required_skills)
                best_match = {
                    'worker_id': ws.worker_id,
                    'matching_skills_count': matching_count,
                    'total_required_skills': len(required_skills),
                    'missing_skills': missing_skills,
                    'is_available': ws.is_available,
                    'conflict_reason': ws.conflict_reason if not ws.is_available else None
                }

        return best_match

    def _get_timestamp(self) -> str:
        """Generate a timestamp for the analysis."""
        from datetime import datetime
        return datetime.now().isoformat()

    def get_last_analysis(self) -> Optional[Dict[str, Any]]:
        """Retrieve the last analysis performed (useful for debugging)."""
        return self.last_analysis


# ============================================================================
# TASK 3: RECOMMENDATION ENGINE
# ============================================================================

class RecommendationEngine:
    """
    Generates actionable recommendations based on diagnostic summaries.

    This engine is COMPLETELY SEPARATE from the DiagnosticEngine. It receives
    the structured summary from diagnostics and produces human-readable,
    actionable tips that can help resolve the scheduling conflict.

    The engine generates three types of recommendations:
    1. Strategic: Long-term solutions (training, hiring)
    2. Tactical: Medium-term adjustments (worker moves, swaps)
    3. Immediate: Quick fixes (constraint relaxation, overtime)
    """

    def __init__(self):
        """Initialize the recommendation engine."""
        self.recommendation_history: List[Dict[str, Any]] = []

    def generate_tips(
        self,
        summary: Dict[str, Any],
        penalty_data: List[PenaltyReport],
        move_data: List[CandidateMove]
    ) -> List[str]:
        """
        Generate a list of actionable recommendations based on diagnostic data.

        This method produces exactly 3 recommendations:
        1. Strategic Tip: Training recommendation for skill gaps
        2. Tactical Tip: Worker movement suggestion
        3. Immediate Fix: Soft constraint relaxation suggestion

        Args:
            summary: Structured diagnostic summary from DiagnosticEngine
            penalty_data: List of PenaltyReport objects showing soft constraint violations
            move_data: List of CandidateMove objects showing potential reassignments

        Returns:
            List of 3 formatted recommendation strings

        Raises:
            ValueError: If summary is missing required keys
        """
        # Validate input
        required_keys = ['shift_id', 'role', 'critical_missing_skill', 'closest_match_worker']
        for key in required_keys:
            if key not in summary:
                raise ValueError(f"summary must contain '{key}' key")

        recommendations = []

        # 1. STRATEGIC TIP: Training recommendation
        strategic_tip = self._generate_strategic_tip(summary)
        recommendations.append(strategic_tip)

        # 2. TACTICAL TIP: Worker move recommendation
        tactical_tip = self._generate_tactical_tip(summary, move_data)
        recommendations.append(tactical_tip)

        # 3. IMMEDIATE FIX: Constraint relaxation recommendation
        immediate_tip = self._generate_immediate_fix(penalty_data)
        recommendations.append(immediate_tip)

        # Store for potential audit trail
        self.recommendation_history.append({
            'summary': summary,
            'recommendations': recommendations,
            'timestamp': self._get_timestamp()
        })

        return recommendations

    def _generate_strategic_tip(self, summary: Dict[str, Any]) -> str:
        """
        Generate a strategic (long-term) recommendation.

        Focuses on training the worker who is closest to having the required
        skills for the problematic shift.

        Args:
            summary: Diagnostic summary

        Returns:
            Formatted strategic recommendation string
        """
        critical_skill = summary['critical_missing_skill']
        closest_worker = summary.get('closest_match_worker')
        shift_id = summary['shift_id']
        role = summary['role']

        if closest_worker and critical_skill:
            worker_id = closest_worker['worker_id']
            missing_skills = closest_worker['missing_skills']
            matching_count = closest_worker['matching_skills_count']
            total_required = closest_worker['total_required_skills']

            if len(missing_skills) == 1:
                tip = (
                    f"[STRATEGIC] Train worker '{worker_id}' in '{critical_skill}' skill. "
                    f"This worker already has {matching_count}/{total_required} required skills "
                    f"for the '{role}' role in shift '{shift_id}' and is the closest match."
                )
            else:
                tip = (
                    f"[STRATEGIC] Prioritize training worker '{worker_id}' in '{critical_skill}' "
                    f"(most critical skill). This worker has {matching_count}/{total_required} "
                    f"required skills and needs {len(missing_skills)} more: {', '.join(missing_skills)}."
                )
        else:
            # Fallback if no close match exists
            tip = (
                f"[STRATEGIC] Consider hiring or training staff with '{critical_skill}' skill "
                f"to address recurring staffing issues for '{role}' role in shift '{shift_id}'."
            )

        return tip

    def _generate_tactical_tip(
        self,
        summary: Dict[str, Any],
        move_data: List[CandidateMove]
    ) -> str:
        """
        Generate a tactical (medium-term) recommendation.

        Suggests moving a worker from one shift to another based on the
        best candidate move available.

        Args:
            summary: Diagnostic summary
            move_data: List of candidate worker moves

        Returns:
            Formatted tactical recommendation string
        """
        target_shift = summary['shift_id']
        role = summary['role']

        if not move_data:
            return (
                f"[TACTICAL] No worker moves available. Consider reviewing the schedule "
                f"to identify workers who could be reassigned to shift '{target_shift}'."
            )

        # Find the best move (lowest impact score)
        best_move = min(move_data, key=lambda m: m.impact_score)

        reason_clause = f" ({best_move.reason})" if best_move.reason else ""

        tip = (
            f"[TACTICAL] Consider moving worker '{best_move.worker_id}' from shift "
            f"'{best_move.source_shift_id}' to shift '{target_shift}' to fill the "
            f"'{role}' role gap{reason_clause}. Impact score: {best_move.impact_score:.2f}."
        )

        return tip

    def _generate_immediate_fix(self, penalty_data: List[PenaltyReport]) -> str:
        """
        Generate an immediate fix recommendation.

        Suggests temporarily relaxing the soft constraint with the highest
        penalty score to potentially resolve the conflict.

        Args:
            penalty_data: List of penalty reports

        Returns:
            Formatted immediate fix recommendation string
        """
        if not penalty_data:
            return (
                "[IMMEDIATE FIX] No soft constraint penalties detected. "
                "Consider manual schedule adjustments or overtime approvals."
            )

        # Find the soft constraint with highest penalty
        worst_penalty = max(penalty_data, key=lambda p: p.penalty_score)

        tip = (
            f"[IMMEDIATE FIX] Temporarily relax soft constraint '{worst_penalty.soft_constraint_id}' "
            f"(current: {worst_penalty.current_setting}) which has the highest penalty score "
            f"({worst_penalty.penalty_score:.1f}). This may allow the solver to find a feasible solution."
        )

        return tip

    def _get_timestamp(self) -> str:
        """Generate a timestamp for the recommendation."""
        from datetime import datetime
        return datetime.now().isoformat()

    def get_recommendation_history(self) -> List[Dict[str, Any]]:
        """Retrieve the history of recommendations generated (useful for audit)."""
        return self.recommendation_history


# ============================================================================
# DEMONSTRATION AND USAGE
# ============================================================================

def main():
    """
    Demonstrate the complete workflow from raw CP solver failure data
    to actionable recommendations.

    This example simulates a typical scenario where:
    - A night shift needs 2 nurses with specific skills
    - The CP solver failed because of skill shortages
    - Several workers are unavailable for various reasons
    - Some soft constraints are being violated
    - The solver generated a few candidate moves
    """
    print("=" * 80)
    print("SCHEDULING DIAGNOSTIC SYSTEM - DEMONSTRATION")
    print("=" * 80)
    print()

    # -------------------------------------------------------------------------
    # STEP 1: Create raw CP solver failure data
    # -------------------------------------------------------------------------
    print("STEP 1: Simulating CP Solver Failure Output")
    print("-" * 80)

    # The main constraint conflict
    conflict = ConstraintConflict(
        shift_id="SHIFT_NIGHT_001",
        role="Nurse",
        required_count=2,
        missing_skills=["ICU_Certification", "Emergency_Care", "Medication_Admin"]
    )
    print(f"Conflict: {conflict}")
    print()

    # Worker availability and skill data
    worker_statuses = [
        WorkerStatus(
            worker_id="W001",
            is_available=False,
            available_skills=["Emergency_Care", "Medication_Admin"],
            conflict_reason="Scheduled elsewhere"
        ),
        WorkerStatus(
            worker_id="W002",
            is_available=True,
            available_skills=["Emergency_Care", "Patient_Care"],
            conflict_reason=""
        ),
        WorkerStatus(
            worker_id="W003",
            is_available=False,
            available_skills=["ICU_Certification", "Emergency_Care", "Medication_Admin"],
            conflict_reason="Time-off requested"
        ),
        WorkerStatus(
            worker_id="W004",
            is_available=True,
            available_skills=["Patient_Care"],
            conflict_reason=""
        ),
        WorkerStatus(
            worker_id="W005",
            is_available=False,
            available_skills=["ICU_Certification", "Medication_Admin"],
            conflict_reason="Not enough hours remaining"
        ),
    ]
    print(f"Worker Statuses: {len(worker_statuses)} workers analyzed")
    for ws in worker_statuses:
        print(f"  - {ws.worker_id}: Available={ws.is_available}, Skills={ws.available_skills}")
    print()

    # Soft constraint penalties
    penalty_reports = [
        PenaltyReport(
            soft_constraint_id="max_consecutive_days",
            penalty_score=8.5,
            current_setting="max_consecutive_days: 5"
        ),
        PenaltyReport(
            soft_constraint_id="preferred_shift_length",
            penalty_score=3.2,
            current_setting="preferred_shift_length: 8h"
        ),
        PenaltyReport(
            soft_constraint_id="min_rest_between_shifts",
            penalty_score=12.7,
            current_setting="min_rest_between_shifts: 11h"
        ),
    ]
    print(f"Penalty Reports: {len(penalty_reports)} soft constraints violated")
    for pr in penalty_reports:
        print(f"  - {pr.soft_constraint_id}: Score={pr.penalty_score}")
    print()

    # Candidate moves suggested by solver
    candidate_moves = [
        CandidateMove(
            worker_id="W001",
            source_shift_id="SHIFT_DAY_003",
            target_shift_id="SHIFT_NIGHT_001",
            impact_score=4.2,
            reason="Has 2/3 required skills"
        ),
        CandidateMove(
            worker_id="W005",
            source_shift_id="SHIFT_EVE_002",
            target_shift_id="SHIFT_NIGHT_001",
            impact_score=2.1,
            reason="Has 2/3 required skills but hours constrained"
        ),
    ]
    print(f"Candidate Moves: {len(candidate_moves)} potential reassignments")
    for cm in candidate_moves:
        print(f"  - Move {cm.worker_id}: {cm.source_shift_id} -> {cm.target_shift_id} (impact: {cm.impact_score})")
    print()

    # -------------------------------------------------------------------------
    # STEP 2: Run Diagnostic Engine
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("STEP 2: Running Diagnostic Engine")
    print("-" * 80)

    diagnostic_engine = DiagnosticEngine()

    conflict_data = {
        'conflict': conflict,
        'worker_statuses': worker_statuses
    }

    diagnostic_summary = diagnostic_engine.generate_summary(conflict_data)

    print("Diagnostic Summary Generated:")
    print(f"  Shift: {diagnostic_summary['shift_id']}")
    print(f"  Role: {diagnostic_summary['role']}")
    print(f"  Staffing Gap: {diagnostic_summary['staffing_gap']}")
    print(f"  Critical Missing Skill: {diagnostic_summary['critical_missing_skill']}")
    print(f"  Total Workers: {diagnostic_summary['total_workers_in_pool']}")
    print(f"  Available: {diagnostic_summary['available_workers_count']}")
    print(f"  Unavailable: {diagnostic_summary['unavailable_workers_count']}")
    print(f"  Closest Match: {diagnostic_summary['closest_match_worker']}")
    print()

    # -------------------------------------------------------------------------
    # STEP 3: Run Recommendation Engine
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("STEP 3: Running Recommendation Engine")
    print("-" * 80)

    recommendation_engine = RecommendationEngine()

    recommendations = recommendation_engine.generate_tips(
        summary=diagnostic_summary,
        penalty_data=penalty_reports,
        move_data=candidate_moves
    )

    print("Generated Recommendations:")
    print()
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
        print()

    # -------------------------------------------------------------------------
    # STEP 4: Summary
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("-" * 80)
    print("The diagnostic system successfully:")
    print("  1. Parsed raw CP solver failure data")
    print("  2. Identified staffing gaps and critical missing skills")
    print("  3. Generated 3 actionable recommendations:")
    print("     - Strategic: Long-term training plan")
    print("     - Tactical: Worker reassignment suggestion")
    print("     - Immediate: Constraint relaxation option")
    print()
    print("This modular design ensures DiagnosticEngine and RecommendationEngine")
    print("remain completely separate, enabling independent evolution and testing.")
    print("=" * 80)


if __name__ == "__main__":
    main()

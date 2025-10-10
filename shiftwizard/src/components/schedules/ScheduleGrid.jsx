import { Assignment } from "@/api/entities";

import InteractiveScheduleGrid from "./InteractiveScheduleGrid";

export default function ScheduleGrid({ schedule, assignments, employees, templates, onUpdateAssignment }) {
  const handleUpdateAssignment = async (assignmentId, updatedData) => {
    try {
      // Update assignment in database
      await Assignment.update(assignmentId, updatedData);
      // Refresh the assignments
      await onUpdateAssignment(schedule.id);
    } catch (error) {
      console.error("Failed to update assignment:", error);
      throw error;
    }
  };

  const handleCreateAssignment = async (assignmentData) => {
    try {
      // Create new assignment
      await Assignment.create(assignmentData);
      // Refresh the assignments
      await onUpdateAssignment(schedule.id);
    } catch (error) {
      console.error("Failed to create assignment:", error);
      throw error;
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this shift assignment?")) {
      try {
        await Assignment.delete(assignmentId);
        await onUpdateAssignment(schedule.id);
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert("Failed to delete assignment. Please try again.");
      }
    }
  };

  // Use the new interactive grid
  return (
    <InteractiveScheduleGrid
      schedule={schedule}
      assignments={assignments}
      employees={employees}
      templates={templates}
      onUpdateAssignment={handleUpdateAssignment}
      onCreateAssignment={handleCreateAssignment}
      onDeleteAssignment={handleDeleteAssignment}
    />
  );
}
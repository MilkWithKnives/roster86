import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { Assignment } from "@/api/entities";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Generate 15-minute time slots from 6:00 AM to 11:45 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function InteractiveScheduleGrid({ 
  schedule, 
  assignments, 
  employees, 
  templates, 
  onUpdateAssignment,
  onCreateAssignment,
  onDeleteAssignment 
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargets, setDropTargets] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  const getEmployeeById = (id) => employees.find(emp => emp.id === id);
  
  const getAssignmentsForTimeSlot = (day, timeSlot) => {
    return assignments.filter(assignment => {
      const assignmentStart = assignment.start_time;
      const assignmentEnd = assignment.end_time;
      
      return assignment.day === day && 
             assignmentStart <= timeSlot && 
             assignmentEnd > timeSlot;
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour + endMin/60) - (startHour + startMin/60);
  };

  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getShiftSpan = (assignment) => {
    const startMinutes = timeToMinutes(assignment.start_time);
    const endMinutes = timeToMinutes(assignment.end_time);
    const startSlotIndex = timeSlots.findIndex(slot => timeToMinutes(slot) >= startMinutes);
    const endSlotIndex = timeSlots.findIndex(slot => timeToMinutes(slot) >= endMinutes);
    return { startSlotIndex, endSlotIndex: endSlotIndex === -1 ? timeSlots.length : endSlotIndex };
  };

  const handleDragStart = (result) => {
    const { draggableId, source } = result;
    setDraggedItem({ id: draggableId, source });
    
    if (source.droppableId.startsWith('employee-')) {
      // Highlight all available time slots when dragging from employee list
      const targets = new Set();
      days.forEach(day => {
        timeSlots.forEach(slot => {
          targets.add(`${day}-${slot}`);
        });
      });
      setDropTargets(targets);
    }
  };

  const withTimeout = (promise, timeoutMs = 10000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    setDraggedItem(null);
    setDropTargets(new Set());
    setHoveredCell(null);

    if (!destination || isProcessing) return;

    setIsProcessing(true);
    
    try {
      if (source.droppableId.startsWith('employee-') && destination.droppableId.includes('-')) {
        // Creating new assignment from employee
        const [day, startTime] = destination.droppableId.split('-');
        const employeeId = draggableId;
        
        // Create 2-hour shift by default (8 slots of 15 minutes)
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = Math.min(startMinutes + 120, 23 * 60 + 45); // Max 11:45 PM
        const endTime = minutesToTime(endMinutes);
        
        const newAssignment = {
          schedule_id: schedule.id,
          employee_id: employeeId,
          day: day,
          start_time: startTime,
          end_time: endTime,
          hours: calculateHours(startTime, endTime),
          status: "scheduled"
        };
        
        await withTimeout(onCreateAssignment(newAssignment));
      } else if (source.droppableId !== destination.droppableId) {
        // Moving existing assignment
        const assignment = assignments.find(a => a.id === draggableId);
        if (!assignment) return;

        const [newDay, newStartTime] = destination.droppableId.split('-');
        const currentDuration = calculateHours(assignment.start_time, assignment.end_time);
        
        // Calculate new end time maintaining duration
        const startMinutes = timeToMinutes(newStartTime);
        const endMinutes = Math.min(startMinutes + (currentDuration * 60), 23 * 60 + 45);
        const newEndTime = minutesToTime(endMinutes);
        
        const updatedAssignment = {
          ...assignment,
          day: newDay,
          start_time: newStartTime,
          end_time: newEndTime,
          hours: calculateHours(newStartTime, newEndTime)
        };
        
        await withTimeout(onUpdateAssignment(assignment.id, updatedAssignment));
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellMouseEnter = (day, timeSlot) => {
    setHoveredCell(`${day}-${timeSlot}`);
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
  };

  if (!schedule) {
    return (
      <div className="premium-card p-12 text-center rounded-3xl">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center">
          <Calendar className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Select a Schedule
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Choose a schedule to start managing shifts with drag & drop
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Employee Sidebar */}
        <div className="lg:col-span-1">
          <div className="premium-card p-6 rounded-3xl sticky top-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-secondary flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Available Staff
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Drag to schedule
                </p>
              </div>
            </div>
            
            <Droppable droppableId="employee-sidebar">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {employees.map((employee, index) => (
                    <Draggable key={employee.id} draggableId={employee.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`premium-button p-4 rounded-2xl transition-all duration-300 cursor-grab active:cursor-grabbing ${
                            snapshot.isDragging ? 'shadow-strong scale-105 rotate-2' : 'hover:shadow-medium hover:scale-102'
                          }`}
                          style={{
                            ...provided.draggableProps.style,
                            background: snapshot.isDragging ? 'var(--accent-primary)' : 'var(--glass-bg)'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-tertiary flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {employee.name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate" style={{ 
                                color: snapshot.isDragging ? 'white' : 'var(--text-primary)' 
                              }}>
                                {employee.name}
                              </p>
                              <p className="text-xs opacity-75" style={{ 
                                color: snapshot.isDragging ? 'white' : 'var(--text-secondary)' 
                              }}>
                                {employee.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="lg:col-span-3">
          <div className="premium-card overflow-hidden rounded-3xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Week of {new Date(schedule.week_start_date).toLocaleDateString()}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span>{schedule.total_hours || 0} total hours</span>
                      <span>•</span>
                      <span>{schedule.coverage_percentage || 0}% coverage</span>
                      <span>•</span>
                      <span>Fairness: {schedule.fairness_score || 0}/100</span>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl font-medium ${
                  schedule.status === 'published' ? 'gradient-primary text-white' : 
                  schedule.status === 'locked' ? 'bg-gray-400 text-white' : 'bg-amber-400 text-white'
                }`}>
                  {schedule.status}
                </div>
              </div>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 rounded-3xl">
                <div className="bg-white rounded-2xl p-6 shadow-strong">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-700 font-medium">Processing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Time Grid */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 min-w-[1200px]">
                {/* Header Row */}
                <div className="p-4 border-b border-r border-white/10 bg-white/5">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Time</span>
                </div>
                {days.map((day) => (
                  <div key={day} className="p-4 border-b border-r border-white/10 bg-white/5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {day}
                    </span>
                  </div>
                ))}

                {/* Time Slots - Show only every hour label, but include all 15-min slots */}
                {timeSlots.map((timeSlot, slotIndex) => {
                  const isHourMark = timeSlot.endsWith(':00');
                  
                  return (
                    <React.Fragment key={timeSlot}>
                      {/* Time Label - only show for hour marks */}
                      <div className={`p-2 border-b border-r border-white/5 bg-white/2 flex items-center ${
                        isHourMark ? 'min-h-[60px]' : 'min-h-[15px]'
                      }`}>
                        {isHourMark && (
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {formatTime(timeSlot)}
                          </span>
                        )}
                      </div>

                      {/* Day Columns */}
                      {days.map((day) => {
                        const slotAssignments = getAssignmentsForTimeSlot(day, timeSlot);
                        const dropZoneId = `${day}-${timeSlot}`;
                        const isDropTarget = dropTargets.has(dropZoneId);
                        const isHovered = hoveredCell === dropZoneId;
                        
                        return (
                          <Droppable key={dropZoneId} droppableId={dropZoneId}>
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`${isHourMark ? 'min-h-[60px]' : 'min-h-[15px]'} p-1 border-b border-r border-white/5 transition-all duration-200 ${
                                  snapshot.isDraggingOver ? 'bg-blue-500/20 border-blue-400/50' :
                                  isDropTarget && isHovered ? 'bg-green-500/20 border-green-400/50' :
                                  isDropTarget ? 'bg-green-500/10 border-green-400/30' : 'hover:bg-white/5'
                                }`}
                                onMouseEnter={() => handleCellMouseEnter(day, timeSlot)}
                                onMouseLeave={handleCellMouseLeave}
                              >
                                {/* Only render shift assignments on their starting slot */}
                                {slotAssignments.map((assignment) => {
                                  const { startSlotIndex } = getShiftSpan(assignment);
                                  if (startSlotIndex !== slotIndex) return null;
                                  
                                  const employee = getEmployeeById(assignment.employee_id);
                                  const span = getShiftSpan(assignment);
                                  const heightMultiplier = span.endSlotIndex - span.startSlotIndex;
                                  
                                  return (
                                    <Draggable key={assignment.id} draggableId={assignment.id} index={0}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`premium-card p-2 rounded-lg mb-1 cursor-grab active:cursor-grabbing transition-all duration-300 group relative ${
                                            snapshot.isDragging ? 'shadow-strong scale-105 rotate-1 z-50' : 'hover:shadow-medium'
                                          }`}
                                          style={{
                                            ...provided.draggableProps.style,
                                            background: snapshot.isDragging ? 'var(--accent-secondary)' : 'var(--glass-bg)',
                                            height: `${heightMultiplier * (isHourMark ? 15 : 3.75)}px`,
                                            minHeight: `${heightMultiplier * 15}px`
                                          }}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded gradient-tertiary flex items-center justify-center flex-shrink-0">
                                              <span className="text-white text-xs font-bold">
                                                {employee?.name?.charAt(0) || 'U'}
                                              </span>
                                            </div>
                                            <span className="text-xs font-medium truncate" style={{ 
                                              color: snapshot.isDragging ? 'white' : 'var(--text-primary)' 
                                            }}>
                                              {employee?.name || 'Unknown'}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteAssignment(assignment.id);
                                              }}
                                              className="ml-auto w-3 h-3 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 flex items-center justify-center transition-all"
                                            >
                                              <Trash2 className="w-2 h-2 text-red-500" />
                                            </button>
                                          </div>
                                          
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-1">
                                              <Clock className="w-2 h-2 opacity-60" />
                                              <span className="text-xs opacity-75" style={{ 
                                                color: snapshot.isDragging ? 'white' : 'var(--text-secondary)' 
                                              }}>
                                                {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
                                              </span>
                                            </div>
                                            {assignment.location && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="w-2 h-2 opacity-60" />
                                                <span className="text-xs opacity-75 truncate" style={{ 
                                                  color: snapshot.isDragging ? 'white' : 'var(--text-secondary)' 
                                                }}>
                                                  {assignment.location}
                                                </span>
                                              </div>
                                            )}
                                            <div className="inline-block">
                                              <span className="text-xs px-1 py-0.5 rounded bg-white/20 font-medium" style={{ 
                                                color: snapshot.isDragging ? 'white' : 'var(--text-primary)' 
                                              }}>
                                                {assignment.hours}h
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                
                                {/* Drop Zone Indicator */}
                                {(snapshot.isDraggingOver || (isDropTarget && isHovered)) && (
                                  <div className="border-2 border-dashed border-blue-400/50 rounded-lg p-2 flex items-center justify-center min-h-[30px]">
                                    <div className="text-center">
                                      <Plus className="w-3 h-3 mx-auto mb-1 text-blue-400" />
                                      <span className="text-xs text-blue-400 font-medium">Drop here</span>
                                    </div>
                                  </div>
                                )}
                                
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
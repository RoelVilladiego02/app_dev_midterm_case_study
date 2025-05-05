import React from 'react';
import styles from '../componentsStyles/TaskProgress.module.css';

const TaskProgress = ({ tasks }) => {
  // Get timeline boundaries
  const today = new Date();
  const allDates = tasks.flatMap(task => [
    new Date(task.created_at || today),
    new Date(task.due_date || today)
  ]);
  
  const timelineStart = new Date(Math.min(...allDates));
  const timelineEnd = new Date(Math.max(...allDates));
  const totalDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

  // Calculate progress statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;

  // Helper function to get task completion based on status
  const getTaskCompletion = (status) => {
    switch (status) {
      case 'completed': return 100;
      case 'in_progress': return 50;
      case 'todo':
      default: return 0;
    }
  };

  // Helper function to get task bar color
  const getTaskColor = (status) => {
    switch (status) {
      case 'completed': return '#198754';
      case 'in_progress': return '#0dcaf0';
      default: return '#6c757d';
    }
  };

  // Calculate task bar position and width
  const getTaskPosition = (task) => {
    const startDate = new Date(task.created_at || today);
    const endDate = new Date(task.due_date || today);

    // If no due date, make task span 7 days from creation
    const taskEndDate = task.due_date ? endDate : new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    // Calculate position percentage
    const startOffset = Math.max(0, ((startDate - timelineStart) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    
    // Calculate width percentage
    const duration = Math.max(1, (taskEndDate - startDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
    
    // Ensure the task doesn't extend beyond timeline
    const maxWidth = 100 - startOffset;
    let finalWidth = Math.min(duration, maxWidth);

    // Adjust width based on status
    switch (task.status) {
      case 'completed':
        // Keep full width for completed tasks
        break;
      case 'in_progress':
        // 50% of normal width for in_progress tasks
        finalWidth = finalWidth * 0.5;
        break;
      case 'todo':
      default:
        // 1% of normal width for todo tasks
        finalWidth = finalWidth * 0.01;
        break;
    }

    return { 
      left: `${startOffset}%`, 
      width: `${finalWidth}%` 
    };
  };

  // Generate timeline markers (monthly)
  const generateTimelineMarkers = () => {
    const markers = [];
    let currentDate = new Date(timelineStart);
    while (currentDate <= timelineEnd) {
      markers.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return markers;
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.statistics}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Tasks:</span>
          <span className={styles.statValue}>{totalTasks}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Completed:</span>
          <span className={styles.statValue}>{completedTasks}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>In Progress:</span>
          <span className={styles.statValue}>{inProgressTasks}</span>
        </div>
      </div>

      <div className={styles.ganttContainer}>
        <div className={styles.timelineHeader}>
          {generateTimelineMarkers().map((date, index) => (
            <div key={index} className={styles.timelineMark}>
              {date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </div>
          ))}
        </div>

        <div className={styles.tasksContainer}>
          <div className={styles.taskLabels}>
            {tasks.map(task => (
              <div key={task.id} className={styles.taskLabel}>
                {task.title}
              </div>
            ))}
          </div>

          <div className={styles.taskBars}>
            <div className={styles.today} style={{ left: `${((today - timelineStart) / (1000 * 60 * 60 * 24)) / totalDays * 100}%` }} />
            {tasks.map(task => (
              <div key={task.id} className={styles.taskBarRow}>
                <div
                  className={styles.taskBar}
                  style={{
                    ...getTaskPosition(task),
                    backgroundColor: getTaskColor(task.status)
                  }}
                >
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${getTaskCompletion(task.status)}%` }}
                  />
                  <span className={styles.taskInfo}>
                    {getTaskCompletion(task.status)}% - {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskProgress;

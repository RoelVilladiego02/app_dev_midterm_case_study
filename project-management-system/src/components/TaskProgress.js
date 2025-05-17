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

  // FIXED: Always trust the server's completion_percentage exactly as provided
  const getTaskCompletion = (task) => {
    if (!task) return 0;

    // Log task data for debugging
    console.log('Processing task completion:', {
      id: task.id,
      title: task.title,
      status: task.status,
      stored_percentage: task.completion_percentage,
      type: typeof task.completion_percentage
    });

    // Simply return the stored completion percentage
    if (task.completion_percentage !== null && task.completion_percentage !== undefined) {
      return parseInt(task.completion_percentage);
    }

    // Only use defaults if no completion_percentage exists
    if (task.status === 'completed') return 100;
    if (task.status === 'todo') return 0;
    return 50; // Default for in_progress
  };

  // Helper function to get task bar color
  const getTaskColor = (status) => {
    switch (status) {
      case 'completed': return '#198754'; // green
      case 'in_progress': return '#0dcaf0'; // cyan
      default: return '#6c757d'; // gray
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
    const finalWidth = Math.min(duration, maxWidth);

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

  // Log task completion percentages for debugging
  console.log('Tasks with completion percentages:', tasks.map(task => ({
    id: task.id,
    title: task.title,
    status: task.status,
    original_completion: task.completion_percentage,
    calculated_completion: getTaskCompletion(task)
  })));

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

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.statusIndicator} ${styles.todo}`}></span>
          <span>To Do</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.statusIndicator} ${styles.in_progress}`}></span>
          <span>In Progress</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.statusIndicator} ${styles.completed}`}></span>
          <span>Completed</span>
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
            <div className={styles.timelineGrid}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={styles.gridLine} />
              ))}
            </div>
            
            <div className={styles.today} style={{ 
              left: `${((today - timelineStart) / (1000 * 60 * 60 * 24)) / totalDays * 100}%` 
            }} />

            {tasks.map(task => {
              // Get completion without modification
              const completion = getTaskCompletion(task);
              
              console.log('Task bar rendering:', {
                taskId: task.id,
                title: task.title,
                status: task.status,
                completion: completion,
                original_percentage: task.completion_percentage
              });
              
              return (
                <div key={task.id} className={styles.taskBarRow}>
                  <div
                    className={styles.taskBar}
                    style={{
                      ...getTaskPosition(task)
                    }}
                  >
                    <div
                      className={styles.progressFill}
                      style={{ 
                        width: `${completion}%`,
                        backgroundColor: getTaskColor(task.status)
                      }}
                    />
                    <span className={styles.taskInfo}>
                      {completion}%
                    </span>
                    <div className={styles.taskTooltip}>
                      <strong>{task.title}</strong><br />
                      Status: {task.status}<br />
                      Progress: {completion}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskProgress;
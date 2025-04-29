import React from 'react';
import styles from '../componentsStyles/ProjectProgress.module.css';

const ProjectProgress = ({ tasks }) => {
  // Calculate start and end dates for the timeline
  const today = new Date();
  const allDates = tasks.map(task => [
    new Date(task.start_date || today),
    new Date(task.due_date || today)
  ]).flat();
  
  const timelineStart = new Date(Math.min(...allDates));
  const timelineEnd = new Date(Math.max(...allDates));
  
  // Calculate total timeline duration in days
  const totalDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));
  
  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getTaskColor = (status) => {
    switch (status) {
      case 'completed': return '#198754';
      case 'in_progress': return '#0dcaf0';
      default: return '#6c757d';
    }
  };

  const getTaskPosition = (task) => {
    const startDate = new Date(task.start_date || today);
    const endDate = new Date(task.due_date || today);
    const startOffset = ((startDate - timelineStart) / (1000 * 60 * 60 * 24)) / totalDays * 100;
    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24) / totalDays * 100;
    return { left: `${startOffset}%`, width: `${duration}%` };
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.overallProgress}>
        <h3>Project Progress</h3>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
          <span className={styles.progressLabel}>{Math.round(overallProgress)}%</span>
        </div>
        <div className={styles.progressStats}>
          <span>Completed Tasks: {completedTasks}</span>
          <span>Total Tasks: {totalTasks}</span>
        </div>
      </div>

      <div className={styles.ganttChart}>
        <div className={styles.timeline}>
          {Array.from({ length: 5 }).map((_, i) => {
            const date = new Date(timelineStart);
            date.setDate(date.getDate() + Math.floor(totalDays * i / 4));
            return (
              <div key={i} className={styles.timelineMark}>
                {date.toLocaleDateString()}
              </div>
            );
          })}
        </div>
        
        <div className={styles.tasks}>
          {tasks.map(task => (
            <div key={task.id} className={styles.taskRow}>
              <div className={styles.taskLabel}>
                {task.title}
              </div>
              <div className={styles.taskBar}>
                <div
                  className={styles.taskProgress}
                  style={{
                    ...getTaskPosition(task),
                    backgroundColor: getTaskColor(task.status)
                  }}
                >
                  <span className={styles.taskCompletion}>
                    {task.completion_percentage || 0}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectProgress;

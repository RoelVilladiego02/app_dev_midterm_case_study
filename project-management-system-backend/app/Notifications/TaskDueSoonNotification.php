<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskDueSoonNotification extends Notification
{
    use Queueable;

    protected $task;
    protected $daysRemaining;

    public function __construct($task, $daysRemaining)
    {
        $this->task = $task;
        $this->daysRemaining = $daysRemaining;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'task_due_soon',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'days_remaining' => $this->daysRemaining,
            'project_id' => $this->task->project_id,
            'status' => 'new'
        ];
    }
}

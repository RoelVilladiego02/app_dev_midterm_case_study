<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\TaskComment;

class TaskCommentNotification extends Notification
{
    use Queueable;

    protected $comment;
    protected $task;
    protected $project;
    protected $commenter;

    public function __construct(TaskComment $comment)
    {
        $this->comment = $comment;
        $this->task = $comment->task;
        $this->project = $comment->task->project;
        $this->commenter = $comment->user;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toDatabase($notifiable)
    {
        return [
            'comment_id' => $this->comment->id,
            'task_id' => $this->task->id,
            'project_id' => $this->project->id,
            'commenter_id' => $this->commenter->id,
            'commenter_name' => $this->commenter->name,
            'task_title' => $this->task->title,
            'message' => "{$this->commenter->name} commented on task: {$this->task->title}",
            'comment_text' => $this->comment->comment_text,
            'created_at' => now(),
            'status' => 'unread',
            'type' => 'task_comment'
        ];
    }
}

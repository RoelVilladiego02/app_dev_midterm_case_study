<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\TaskComment;

class TaskCommentAdded extends Notification
{
    use Queueable;

    protected $comment;

    public function __construct(TaskComment $comment)
    {
        $this->comment = $comment;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toDatabase($notifiable)
    {
        return [
            'comment_id' => $this->comment->id,
            'task_id' => $this->comment->task_id,
            'task_title' => $this->comment->task->title,
            'commenter_name' => $this->comment->user->name,
            'comment_text' => $this->comment->comment_text,
            'project_id' => $this->comment->task->project_id,
            'type' => 'task_comment',
            'status' => 'new'
        ];
    }
}

<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TaskFileUploadNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $task;
    public $project;
    public $uploadedBy;
    public $fileName;

    public function __construct($task, $project, $uploadedBy, $fileName)
    {
        $this->task = $task;
        $this->project = $project;
        $this->uploadedBy = $uploadedBy;
        $this->fileName = $fileName;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'task_file_upload',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
            'uploader_id' => $this->uploadedBy->id,
            'uploader_name' => $this->uploadedBy->name,
            'file_name' => $this->fileName,
            'message' => "{$this->uploadedBy->name} uploaded a file ({$this->fileName}) to task: {$this->task->title}"
        ];
    }
}

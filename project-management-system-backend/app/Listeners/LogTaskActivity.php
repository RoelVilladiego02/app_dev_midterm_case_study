<?php

namespace App\Listeners;

use App\Events\TaskActivity;
use App\Models\ActivityLog;

class LogTaskActivity
{
    public function handle(TaskActivity $event)
    {
        ActivityLog::create([
            'user_id' => $event->userId,
            'task_id' => $event->taskId,
            'action' => $event->action,
            'description' => $event->description,
            'metadata' => $event->metadata
        ]);
    }
}

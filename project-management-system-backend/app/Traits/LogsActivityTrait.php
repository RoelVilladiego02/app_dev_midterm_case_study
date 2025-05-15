<?php

namespace App\Traits;

use App\Models\ActivityLog;

trait LogsActivityTrait
{
    public function logActivity($action, $description = null, $metadata = [], $taskId = null)
    {
        return ActivityLog::create([
            'user_id' => auth()->id(),
            'project_id' => $this->project_id ?? $this->id,
            'task_id' => $taskId,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata
        ]);
    }
}

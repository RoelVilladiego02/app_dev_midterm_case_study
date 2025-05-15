<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskActivity
{
    use Dispatchable, SerializesModels;

    public $userId;
    public $taskId;
    public $action;
    public $description;
    public $metadata;

    public function __construct($userId, $taskId, $action, $description = null, $metadata = [])
    {
        $this->userId = $userId;
        $this->taskId = $taskId;
        $this->action = $action;
        $this->description = $description;
        $this->metadata = $metadata;
    }
}

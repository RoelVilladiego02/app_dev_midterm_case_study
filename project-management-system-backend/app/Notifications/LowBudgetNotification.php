<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LowBudgetNotification extends Notification
{
    use Queueable;

    protected $project;
    protected $remainingPercentage;

    public function __construct($project, $remainingPercentage)
    {
        $this->project = $project;
        $this->remainingPercentage = $remainingPercentage;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'low_budget_alert',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
            'remaining_percentage' => $this->remainingPercentage,
            'status' => 'new'
        ];
    }
}

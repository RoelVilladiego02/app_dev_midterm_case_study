<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProjectDeadlineNotification extends Notification
{
    use Queueable;

    protected $project;
    protected $daysRemaining;

    public function __construct($project, $daysRemaining)
    {
        $this->project = $project;
        $this->daysRemaining = $daysRemaining;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'project_ending_soon',
            'project_id' => $this->project->id,
            'project_title' => $this->project->title,
            'days_remaining' => $this->daysRemaining,
            'status' => 'new'
        ];
    }
}

<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RiskReviewDueNotification extends Notification
{
    use Queueable;

    protected $risk;

    public function __construct($risk)
    {
        $this->risk = $risk;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'risk_review_due',
            'risk_id' => $this->risk->id,
            'project_id' => $this->risk->project_id,
            'title' => $this->risk->title,
            'severity' => $this->risk->severity,
            'status' => $this->risk->status,
            'days_since_review' => $this->risk->last_review_date 
                ? $this->risk->last_review_date->diffInDays(now()) 
                : null,
            'project_title' => $this->risk->project->title,
            'status' => 'new'
        ];
    }
}

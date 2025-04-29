<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Models\TeamInvitation;

class TeamInvitationNotification extends Notification
{
    use Queueable;

    protected $invitation;

    public function __construct(TeamInvitation $invitation)
    {
        $this->invitation = $invitation;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toDatabase($notifiable)
    {
        return [
            'invitation_id' => $this->invitation->id,
            'project_id' => $this->invitation->project_id,
            'project_name' => $this->invitation->project->title,
            'sender_name' => $this->invitation->sender->name,
            'message' => $this->invitation->sender->name . ' has invited you to join the project: ' . $this->invitation->project->title,
            'invitation_status' => 'pending',
            'status' => 'new'
        ];
    }
}

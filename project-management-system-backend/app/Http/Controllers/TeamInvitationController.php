<?php

namespace App\Http\Controllers;

use App\Models\TeamInvitation;
use App\Models\Project;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\Request;

class TeamInvitationController extends Controller
{
    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        $validated = $request->validate([
            'recipient_id' => 'required|exists:users,id'
        ]);

        $invitation = TeamInvitation::create([
            'project_id' => $project->id,
            'sender_id' => auth()->id(),
            'recipient_id' => $validated['recipient_id'],
        ]);

        $invitation->recipient->notify(new TeamInvitationNotification($invitation));

        return response()->json($invitation, 201);
    }

    public function respond(Request $request, $id)
    {
        $invitation = TeamInvitation::findOrFail($id);
        
        if ($invitation->recipient_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:accepted,declined'
        ]);

        $invitation->update(['status' => $validated['status']]);

        if ($validated['status'] === 'accepted') {
            try {
                if (!$invitation->project->teamMembers()->where('user_id', $invitation->recipient_id)->exists()) {
                    $invitation->project->teamMembers()->attach($invitation->recipient_id);
                }
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Failed to add team member',
                    'error' => $e->getMessage()
                ], 500);
            }
        }
        
        $notification = auth()->user()->notifications()
            ->whereJsonContains('data->invitation_id', (string)$id)
            ->first();
            
        if ($notification) {
            $notificationData = $notification->data;
            $notificationData['invitation_status'] = $validated['status'];
            $notificationData['status'] = 'handled';
            $notification->data = $notificationData;
            $notification->markAsRead();
            $notification->save();
            
            return response()->json([
                'status' => $validated['status'],
                'invitation_id' => $id,
                'notification_id' => $notification->id
            ]);
        }

        return response()->json($invitation);
    }
}
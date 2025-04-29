<?php

namespace App\Http\Controllers;

use App\Models\TeamInvitation;
use App\Models\Project;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TeamInvitationController extends Controller
{
    public function store(Request $request, $projectId)
    {
        try {
            Log::info('Starting team invitation process', [
                'project_id' => $projectId,
                'request_data' => $request->all(),
                'auth_user' => auth()->id()
            ]);
            
            // Find the project first
            $project = Project::findOrFail($projectId);
            
            // Add authorization check
            if ($project->user_id !== auth()->id()) {
                // Check if user is a team member before rejecting
                $isTeamMember = $project->teamMembers()->where('user_id', auth()->id())->exists();
                if (!$isTeamMember) {
                    Log::warning('Unauthorized invitation attempt', [
                        'project_id' => $projectId,
                        'user_id' => auth()->id()
                    ]);
                    return response()->json(['message' => 'You do not have permission to add team members to this project'], 403);
                }
            }
            
            // Validate the request data
            $validated = $request->validate([
                'recipient_id' => 'required|exists:users,id'
            ]);

            // Log the data being received
            Log::info('Creating team invitation', [
                'project_id' => $project->id,
                'sender_id' => auth()->id(),
                'recipient_id' => $validated['recipient_id']
            ]);

            // Check if invitation already exists
            $existingInvitation = TeamInvitation::where('project_id', $project->id)
                ->where('recipient_id', $validated['recipient_id'])
                ->where('status', 'pending')
                ->first();
                
            if ($existingInvitation) {
                return response()->json(['message' => 'User already has a pending invitation'], 409);
            }
            
            // Check if user is already a team member
            $isAlreadyTeamMember = $project->teamMembers()->where('user_id', $validated['recipient_id'])->exists();
            if ($isAlreadyTeamMember) {
                return response()->json(['message' => 'User is already a team member'], 409);
            }

            // Create the invitation
            $invitation = TeamInvitation::create([
                'project_id' => $project->id,
                'sender_id' => auth()->id(),
                'recipient_id' => $validated['recipient_id'],
                'status' => 'pending'
            ]);

            Log::info('Invitation created successfully', ['invitation_id' => $invitation->id]);

            try {
                // Get recipient user and send notification
                $recipient = User::findOrFail($validated['recipient_id']);
                $recipient->notify(new TeamInvitationNotification($invitation));
                Log::info('Notification sent successfully');
            } catch (\Exception $notificationError) {
                Log::error('Failed to send notification', [
                    'error' => $notificationError->getMessage(),
                    'invitation_id' => $invitation->id
                ]);
                // Continue anyway - the invitation was created
            }

            return response()->json([
                'message' => 'Invitation sent successfully',
                'invitation' => $invitation
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Team invitation creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'project_id' => $projectId ?? null,
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Failed to create invitation: ' . $e->getMessage(),
                'detail' => 'An error occurred while processing your request'
            ], 500);
        }
    }

    public function respond(Request $request, $id)
    {
        try {
            $invitation = TeamInvitation::findOrFail($id);
            
            if ($invitation->recipient_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'status' => 'required|in:accepted,declined'
            ]);

            $invitation->update(['status' => $validated['status']]);

            if ($validated['status'] === 'accepted') {
                if (!$invitation->project->teamMembers()->where('user_id', $invitation->recipient_id)->exists()) {
                    $invitation->project->teamMembers()->attach($invitation->recipient_id);
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
        } catch (\Exception $e) {
            Log::error('Team invitation response failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to respond to invitation: ' . $e->getMessage()
            ], 500);
        }
    }
}
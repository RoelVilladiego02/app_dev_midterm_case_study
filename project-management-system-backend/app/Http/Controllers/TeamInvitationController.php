<?php

namespace App\Http\Controllers;

use App\Models\TeamInvitation;
use App\Models\Project;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;

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

    public function show($id)
    {
        try {
            $invitation = TeamInvitation::with(['project', 'sender', 'recipient'])->findOrFail($id);
            
            // Check if user has permission to view this invitation
            if ($invitation->recipient_id !== auth()->id() && 
                $invitation->sender_id !== auth()->id() &&
                $invitation->project->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized to view this invitation'], 403);
            }
            
            return response()->json($invitation);
            
        } catch (\Exception $e) {
            Log::error('Failed to fetch invitation', [
                'error' => $e->getMessage(),
                'invitation_id' => $id,
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Invitation not found',
                'detail' => $e instanceof ModelNotFoundException ? 'The specified invitation does not exist' : 'An error occurred'
            ], 404);
        }
    }

    public function respond(Request $request, $id)
    {
        try {
            $invitation = TeamInvitation::with('project')->findOrFail($id);
            
            if ($invitation->recipient_id !== auth()->id()) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'detail' => 'You are not the recipient of this invitation'
                ], 403);
            }

            if ($invitation->status !== 'pending') {
                return response()->json([
                    'message' => 'Invalid invitation status',
                    'detail' => 'This invitation has already been ' . $invitation->status
                ], 400);
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
                'trace' => $e->getTraceAsString(),
                'invitation_id' => $id,
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Failed to respond to invitation',
                'detail' => $e instanceof ModelNotFoundException ? 'Invitation not found' : 'An error occurred'
            ], $e instanceof ModelNotFoundException ? 404 : 500);
        }
    }
    
    // NEW METHOD: Get pending invitations for a project
    public function getProjectInvitations($projectId)
    {
        try {
            // First, check if user has permission to view this project's invitations
            $project = Project::findOrFail($projectId);
            
            $isOwner = $project->user_id === auth()->id();
            $isTeamMember = $project->teamMembers()->where('user_id', auth()->id())->exists();
            
            if (!$isOwner && !$isTeamMember) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            // For owners, show all pending invitations
            $pendingInvitations = TeamInvitation::where('project_id', $projectId)
                ->where('status', 'pending')
                ->with(['recipient:id,name,email']) // Eager load recipient data
                ->get();
                
            return response()->json($pendingInvitations);
            
        } catch (\Exception $e) {
            Log::error('Failed to fetch project invitations', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch invitations: ' . $e->getMessage()
            ], 500);
        }
    }
    
    // NEW METHOD: Cancel an invitation (only for project owners)
    public function cancelInvitation($id)
    {
        try {
            $invitation = TeamInvitation::with(['project', 'recipient'])->findOrFail($id);
            
            // Security check - only allow project owner to cancel invitations
            if ($invitation->project->user_id !== auth()->id()) {
                return response()->json(['message' => 'You do not have permission to cancel this invitation'], 403);
            }
            
            // Only allow canceling pending invitations
            if ($invitation->status !== 'pending') {
                return response()->json(['message' => 'Cannot cancel an invitation that is not pending'], 400);
            }

            // Get the recipient user and their notifications before deleting the invitation
            $recipient = $invitation->recipient;
            $notifications = [];
            
            if ($recipient) {
                $notifications = $recipient->notifications()
                    ->whereJsonContains('data->invitation_id', (string)$id)
                    ->get();
            }
            
            // Delete the invitation first
            $invitation->delete();
            
            // Then handle the notifications
            $notificationsDeleted = 0;
            foreach ($notifications as $notification) {
                try {
                    $notification->delete();
                    $notificationsDeleted++;
                } catch (\Exception $e) {
                    Log::warning('Failed to delete notification', [
                        'notification_id' => $notification->id,
                        'invitation_id' => $id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            Log::info('Invitation cancelled successfully', [
                'invitation_id' => $id,
                'notifications_deleted' => $notificationsDeleted
            ]);
            
            return response()->json([
                'message' => 'Invitation cancelled successfully',
                'notifications_deleted' => $notificationsDeleted,
                'invitation_id' => $id
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to cancel invitation', [
                'error' => $e->getMessage(),
                'invitation_id' => $id,
                'user_id' => auth()->id()
            ]);
            
            if ($e instanceof ModelNotFoundException) {
                return response()->json([
                    'message' => 'Invitation not found',
                    'detail' => 'The specified invitation does not exist'
                ], 404);
            }
            
            return response()->json([
                'message' => 'Failed to cancel invitation',
                'detail' => 'An unexpected error occurred'
            ], 500);
        }
    }
}
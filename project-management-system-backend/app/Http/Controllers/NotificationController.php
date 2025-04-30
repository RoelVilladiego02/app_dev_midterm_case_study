<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;
use App\Models\TeamInvitation;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        return response()->json(
            $user->notifications()->paginate(10)
        );
    }
    
    public function markAsRead($id)
    {
        $notification = DatabaseNotification::findOrFail($id);
        if ($notification->notifiable_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $notification->markAsRead();
        return response()->json(['message' => 'Marked as read']);
    }
    
    public function markAsHandled(Request $request, $id)
    {
        $notification = auth()->user()->notifications()->findOrFail($id);
        
        if ($notification->notifiable_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $notification->markAsRead();
        
        $notificationData = $notification->data;
        $notificationData['status'] = 'handled';
        
        if (isset($notificationData['invitation_id'])) {
            $status = $request->input('status', 'handled');
            $notificationData['invitation_status'] = $status;
            $notificationData['cancelled_at'] = $status === 'cancelled' ? now() : null;
        }
        
        $notification->data = $notificationData;
        $notification->save();
        
        return response()->json(['message' => 'Notification marked as handled']);
    }

    public function destroy($id)
    {
        try {
            $notification = auth()->user()->notifications()->findOrFail($id);
            
            if ($notification->notifiable_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            $notification->delete();
            
            return response()->json([
                'message' => 'Notification deleted successfully',
                'notification_id' => $id
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete notification',
                'detail' => $e instanceof ModelNotFoundException ? 'Notification not found' : 'An error occurred'
            ], $e instanceof ModelNotFoundException ? 404 : 500);
        }
    }

    public function cleanupStaleNotifications()
    {
        try {
            $user = auth()->user();
            $deletedCount = 0;
            
            // Get all invitation notifications
            $notifications = $user->notifications()
                ->whereJsonContains('type', 'App\Notifications\TeamInvitationNotification')
                ->get();
            
            foreach ($notifications as $notification) {
                $data = $notification->data;
                if (isset($data['invitation_id'])) {
                    // Check if invitation still exists
                    $invitationExists = TeamInvitation::where('id', $data['invitation_id'])->exists();
                    if (!$invitationExists) {
                        $notification->delete();
                        $deletedCount++;
                    }
                }
            }
            
            return response()->json([
                'message' => 'Stale notifications cleaned up',
                'notifications_deleted' => $deletedCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to cleanup notifications', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Failed to cleanup notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

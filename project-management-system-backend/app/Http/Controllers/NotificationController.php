<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

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
            $notificationData['invitation_status'] = $request->input('status', 'handled');
        }
        
        $notification->data = $notificationData;
        $notification->save();
        
        return response()->json(['message' => 'Notification marked as handled']);
    }
}

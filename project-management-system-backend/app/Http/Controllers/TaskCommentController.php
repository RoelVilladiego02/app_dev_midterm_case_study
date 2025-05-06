<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use App\Notifications\TaskCommentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        $user = auth()->user();
        
        // Check if user is project owner or task assignee
        $isOwner = $task->project->user_id === $user->id;
        $isAssigned = $task->assignedUsers()->where('users.id', $user->id)->exists();

        if (!$isOwner && !$isAssigned) {
            return response()->json([
                'message' => 'You do not have access to this task'
            ], 403);
        }

        return response()->json(
            $task->comments()->with('user')->orderBy('created_at', 'desc')->get()
        );
    }

    public function store(Request $request, Task $task)
    {
        try {
            $user = auth()->user();
            
            if ($task->project->user_id !== $user->id && !$task->isAssignedUser($user)) {
                return response()->json([
                    'message' => 'Only project owners and assigned users can comment on tasks'
                ], 403);
            }

            $validated = $request->validate([
                'comment_text' => 'required|string|max:1000'
            ]);

            $comment = $task->comments()->create([
                'user_id' => auth()->id(),
                'comment_text' => $validated['comment_text']
            ]);

            $comment->load(['task.project', 'user']);

            // Determine who should be notified
            if ($user->id === $task->project->user_id) {
                // Project owner commented - notify assigned users
                $task->assignedUsers()
                    ->where('users.id', '!=', $user->id)
                    ->get()
                    ->each(function ($assignedUser) use ($comment) {
                        $assignedUser->notify(new TaskCommentNotification($comment));
                    });
            } else {
                // Team member commented - notify project owner and other assigned users
                $projectOwner = $task->project->user;
                if ($projectOwner->id !== $user->id) {
                    $projectOwner->notify(new TaskCommentNotification($comment));
                }
                
                $task->assignedUsers()
                    ->where('users.id', '!=', $user->id)
                    ->get()
                    ->each(function ($assignedUser) use ($comment) {
                        $assignedUser->notify(new TaskCommentNotification($comment));
                    });
            }

            return response()->json([
                'message' => 'Comment added successfully',
                'comment' => $comment->load('user')
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to add comment', [
                'error' => $e->getMessage(),
                'task_id' => $task->id
            ]);

            return response()->json([
                'message' => 'Failed to add comment'
            ], 500);
        }
    }

    public function destroy(Task $task, TaskComment $comment)
    {
        // Check project access first
        if ($task->project->user_id !== auth()->id() && 
            !$task->project->teamMembers()->where('user_id', auth()->id())->exists()) {
            return response()->json([
                'message' => 'You do not have access to this task'
            ], 403);
        }

        // Then check comment ownership
        if ($comment->user_id !== auth()->id() && $task->project->user_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized to delete this comment'
            ], 403);
        }

        $comment->delete();
        return response()->json([
            'message' => 'Comment deleted successfully'
        ]);
    }
}

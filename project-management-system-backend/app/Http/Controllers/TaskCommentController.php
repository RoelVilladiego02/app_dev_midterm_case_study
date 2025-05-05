<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use App\Notifications\TaskCommentAdded;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        return response()->json(
            $task->comments()->orderBy('created_at', 'desc')->get()
        );
    }

    public function store(Request $request, Task $task)
    {
        try {
            $validated = $request->validate([
                'comment_text' => 'required|string|max:1000'
            ]);

            $comment = $task->comments()->create([
                'user_id' => auth()->id(),
                'comment_text' => $validated['comment_text']
            ]);

            // Load the relationships needed for notification
            $comment->load(['task', 'user']);

            // Notify all assigned users except the commenter
            $task->assignedUsers()
                ->where('users.id', '!=', auth()->id())
                ->get()
                ->each(function ($user) use ($comment) {
                    $user->notify(new TaskCommentAdded($comment));
                });

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
        if ($comment->user_id !== auth()->id()) {
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

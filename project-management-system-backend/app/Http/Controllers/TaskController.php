<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class TaskController extends Controller
{
    public function index($projectId)
    {
        $tasks = Task::where('project_id', $projectId)
            ->with(['assignedUsers:id,name,email']) // Optimize by selecting specific fields
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                    'assigned_user' => $task->assignedUsers->first(),
                    'assignedUsers' => $task->assignedUsers
                ];
            });

        return response()->json($tasks);
    }

    public function store(Request $request, $projectId)
    {
        try {
            // Log incoming request data
            Log::info('Creating task - Received data:', [
                'project_id' => $projectId,
                'request_data' => $request->all()
            ]);

            $project = Project::findOrFail($projectId);

            // Validate with more flexible rules
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|string|in:todo,in_progress,completed',
                'priority' => 'required|string|in:low,medium,high',
                'due_date' => 'nullable|date_format:Y-m-d|after_or_equal:today',
                'project_id' => 'nullable|exists:projects,id' // Allow but not required
            ]);

            // Clean up the data
            $taskData = array_filter([
                'title' => trim($validated['title']),
                'description' => trim($validated['description'] ?? ''),
                'status' => $validated['status'],
                'priority' => $validated['priority'],
                'due_date' => $validated['due_date'] ?? null,
                'project_id' => $projectId // Ensure project_id is set
            ]);

            $task = $project->tasks()->create($taskData);

            Log::info('Task created successfully', [
                'task_id' => $task->id,
                'project_id' => $projectId
            ]);

            // Return task with relationships
            return response()->json([
                'message' => 'Task created successfully',
                'task' => $task->fresh(['assignedUsers'])
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create task', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
                'request_data' => $request->all()
            ]);

            return response()->json([
                'message' => 'Failed to create task',
                'error' => $e->getMessage(),
                'detail' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    public function show($projectId, $taskId)
    {
        $task = Task::where('project_id', $projectId)
            ->with(['assignedUsers', 'project'])
            ->findOrFail($taskId);
            
        // Check if user has access to the task's project
        if ($task->project->user_id !== auth()->id() && 
            !$task->project->teamMembers()->where('user_id', auth()->id())->exists()) {
            return response()->json([
                'message' => 'You do not have access to this task'
            ], 403);
        }

        return response()->json($task);
    }

    public function update(Request $request, $projectId, $taskId)
    {
        try {
            $task = Task::where('project_id', $projectId)->findOrFail($taskId);

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:todo,in_progress,completed',
                'priority' => 'required|in:low,medium,high',
                'due_date' => 'nullable|date',
            ]);

            $task->update($validated);

            return response()->json([
                'message' => 'Task updated successfully',
                'task' => $task->fresh('assignedUsers')
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update task', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
                'task_id' => $taskId
            ]);
            return response()->json(['message' => 'Failed to update task'], 500);
        }
    }

    public function destroy($projectId, $taskId)
    {
        $task = Task::where('id', $taskId)->where('project_id', $projectId)->firstOrFail();
        $task->delete();
        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function assignUser(Request $request, $projectId, $taskId)
    {
        $task = Task::where('project_id', $projectId)->findOrFail($taskId);
        $user = User::findOrFail($request->user_id);

        // Use teamMembers() to match what's in the ProjectController
        // This now works because we added the team() alias in the Project model
        $isTeamMember = $task->project->team()->where('user_id', $user->id)->exists();
        
        if (!$isTeamMember) {
            return response()->json(['message' => 'User is not part of the project team'], 403);
        }

        $task->assignedUsers()->syncWithoutDetaching([$user->id]);
        return response()->json(['message' => 'User assigned successfully']);
    }

    public function unassignUser($projectId, $taskId, $userId)
    {
        $task = Task::where('project_id', $projectId)->findOrFail($taskId);
        $task->assignedUsers()->detach($userId);
        return response()->json(['message' => 'User unassigned successfully']);
    }

    public function assignedUsers($projectId, $taskId)
    {
        $task = Task::where('project_id', $projectId)->findOrFail($taskId);
        return response()->json($task->assignedUsers);
    }
}
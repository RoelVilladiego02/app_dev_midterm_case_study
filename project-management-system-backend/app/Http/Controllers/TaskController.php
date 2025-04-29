<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\Project;
use App\Models\User;

class TaskController extends Controller
{
    public function index($projectId)
    {
        $tasks = Task::where('project_id', $projectId)->get();
        return response()->json($tasks);
    }

    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in_progress,completed',
            'priority' => 'required|in:low,medium,high',
            'due_date' => 'nullable|date',
        ]);

        $task = $project->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'due_date' => $validated['due_date'] ?? null,
            'user_id' => auth()->id(),
        ]);

        return response()->json($task, 201);
    }

    public function update(Request $request, $projectId, $taskId)
    {
        $task = Task::where('id', $taskId)->where('project_id', $projectId)->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in_progress,completed',
            'priority' => 'required|in:low,medium,high',
            'due_date' => 'nullable|date',
        ]);

        $task->update($validated);
        return response()->json($task);
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

        // Validate user belongs to project
        $projectUsers = $task->project->tasks()->pluck('user_id')->unique();
        if (!$projectUsers->contains($user->id)) {
            return response()->json(['message' => 'User is not part of the project'], 403);
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

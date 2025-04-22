<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\Project;

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
            'status' => 'required|in:pending,in_progress,completed',
            'priority' => 'nullable|integer',
        ]);

        $task = $project->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'] ?? 0,
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
            'status' => 'required|in:pending,in_progress,completed',
            'priority' => 'nullable|integer',
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
}

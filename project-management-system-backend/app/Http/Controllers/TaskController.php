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

        // Check remaining budget
        $currentExpenditure = $project->tasks()->sum('cost');
        $remainingBudget = $project->total_budget - $currentExpenditure;

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in_progress,completed',
            'priority' => 'required|in:low,medium,high',
            'due_date' => 'nullable|date',
            'cost' => 'required|numeric|min:0',
        ]);

        // Validate task cost against remaining budget
        if ($validated['cost'] > $remainingBudget) {
            return response()->json([
                'message' => 'Task cost exceeds remaining project budget',
                'remaining_budget' => $remainingBudget,
                'requested_cost' => $validated['cost']
            ], 422);
        }

        $task = $project->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'due_date' => $validated['due_date'] ?? null,
            'user_id' => auth()->id(),
            'cost' => $validated['cost'],
        ]);

        // Update project's actual expenditure
        $project->actual_expenditure = $currentExpenditure + $validated['cost'];
        $project->save();

        return response()->json($task, 201);
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
        $task = Task::where('id', $taskId)
            ->where('project_id', $projectId)
            ->firstOrFail();
            
        $project = Project::findOrFail($projectId);

        // Calculate remaining budget excluding current task's cost
        $currentExpenditure = $project->tasks()
            ->where('id', '!=', $taskId)
            ->sum('cost');
        $remainingBudget = $project->total_budget - $currentExpenditure;

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in_progress,completed',
            'priority' => 'required|in:low,medium,high',
            'due_date' => 'nullable|date',
            'cost' => 'required|numeric|min:0',
        ]);

        // Validate new cost against remaining budget
        if ($validated['cost'] > ($remainingBudget + $task->cost)) {
            return response()->json([
                'message' => 'Task cost exceeds remaining project budget',
                'remaining_budget' => $remainingBudget + $task->cost,
                'requested_cost' => $validated['cost']
            ], 422);
        }

        // Update project's actual expenditure
        $project->actual_expenditure = $currentExpenditure + $validated['cost'];
        $project->save();

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
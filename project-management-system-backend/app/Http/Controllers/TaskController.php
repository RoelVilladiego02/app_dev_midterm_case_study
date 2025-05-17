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
            ->with(['assignedUsers:id,name,email'])
            ->get()
            ->map(function ($task) {
                // IMPORTANT: Always keep the completion_percentage exactly as stored in the database
                // Only set defaults if the value is NULL - never override an existing value
                $completionPercentage = $task->completion_percentage;
                
                if ($completionPercentage === null) {
                    // Only set default values if no completion percentage exists
                    switch ($task->status) {
                        case 'completed':
                            $completionPercentage = 100;
                            break;
                        case 'in_progress':
                            $completionPercentage = 50;
                            break;
                        default:
                            $completionPercentage = 0;
                    }
                    
                    // Update the task in the database with this default value
                    // This ensures the value persists between requests
                    $task->update(['completion_percentage' => $completionPercentage]);
                }

                Log::debug('Task completion percentage', [
                    'task_id' => $task->id,
                    'status' => $task->status,
                    'original_percentage' => $task->completion_percentage,
                    'final_percentage' => $completionPercentage
                ]);

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                    'completion_percentage' => $completionPercentage,
                    'assigned_user' => $task->assignedUsers->first(),
                    'assignedUsers' => $task->assignedUsers
                ];
            });

        return response()->json($tasks);
    }

    public function store(Request $request, $projectId)
    {
        try {
            Log::info('Creating task - Received data:', [
                'project_id' => $projectId,
                'request_data' => $request->all()
            ]);

            $project = Project::findOrFail($projectId);

            // Updated validation rules
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'priority' => 'required|in:low,medium,high',
                'due_date' => 'nullable|date',
                'status' => 'nullable|in:todo,in_progress,completed', // Make status optional
                'completion_percentage' => 'nullable|integer|min:0|max:100', // Make completion_percentage optional
                'assigned_users' => 'nullable|array',
                'assigned_users.*' => 'exists:users,id'
            ]);

            // Set default status if not provided
            $status = $validated['status'] ?? 'todo';
            
            // Handle completion percentage explicitly
            $completionPercentage = $validated['completion_percentage'] ?? null;
            
            // Only set default completion percentage if none provided
            if ($completionPercentage === null) {
                if ($status === 'completed') {
                    $completionPercentage = 100;
                } elseif ($status === 'in_progress') {
                    $completionPercentage = 50; // Default for in_progress
                } else {
                    $completionPercentage = 0; // Default for todo
                }
            }

            $taskData = array_merge($validated, [
                'status' => $status,
                'completion_percentage' => $completionPercentage,
                'project_id' => $projectId
            ]);

            $task = $project->tasks()->create($taskData);

            // Sync assigned users if provided
            if (!empty($validated['assigned_users'])) {
                $task->assignedUsers()->sync($validated['assigned_users']);
            }

            // Log activity using the trait
            $task->logActivity(
                'task_created',
                'Created new task: ' . $task->title,
                [],
                $task->id
            );

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
            
        $user = auth()->user();
        
        // Allow access if user is:
        // 1. Project owner, or
        // 2. Assigned to the task
        if ($task->project->user_id !== $user->id && !$task->isAssignedUser($user)) {
            return response()->json([
                'message' => 'You do not have access to this task'
            ], 403);
        }

        // Ensure completion_percentage is set
        if ($task->completion_percentage === null) {
            if ($task->status === 'completed') {
                $task->completion_percentage = 100;
            } elseif ($task->status === 'in_progress') {
                $task->completion_percentage = 50;
            } else {
                $task->completion_percentage = 0;
            }
            
            // Save the default value to the database
            $task->save();
        }

        return response()->json($task);
    }

    public function update(Request $request, $projectId, $taskId)
    {
        try {
            $task = Task::where('project_id', $projectId)->findOrFail($taskId);
            $oldStatus = $task->status;
            $oldPercentage = $task->completion_percentage;

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'status' => 'required|in:todo,in_progress,completed',
                'priority' => 'required|in:low,medium,high',
                'due_date' => 'nullable|date',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'assigned_users' => 'nullable|array',
                'assigned_users.*' => 'exists:users,id'
            ]);

            // FIXED: Handle completion percentage explicitly
            // Check if completion_percentage was explicitly provided in the request
            $isPercentageProvided = $request->has('completion_percentage');
            $completionPercentage = $isPercentageProvided ? 
                (int)$request->input('completion_percentage') : $oldPercentage;
            
            // Only set status-based default percentages if:
            // 1. No specific percentage is provided AND
            // 2. Previous percentage is null/undefined
            if (!$isPercentageProvided && $completionPercentage === null) {
                switch ($validated['status']) {
                    case 'completed':
                        $completionPercentage = 100;
                        break;
                    case 'todo':
                        $completionPercentage = 0;
                        break;
                    case 'in_progress':
                        $completionPercentage = 50;
                        break;
                }
            }
            // If percentage is provided but status doesn't match, adjust status
            elseif ($isPercentageProvided) {
                if ($completionPercentage === 100 && $validated['status'] !== 'completed') {
                    $validated['status'] = 'completed';
                } elseif ($completionPercentage === 0 && $validated['status'] !== 'todo') {
                    $validated['status'] = 'todo';
                } elseif ($completionPercentage > 0 && $completionPercentage < 100 && $validated['status'] !== 'in_progress') {
                    $validated['status'] = 'in_progress';
                }
            }
            // If status is changed but percentage wasn't provided, adjust percentage based on status
            elseif ($oldStatus !== $validated['status']) {
                switch ($validated['status']) {
                    case 'completed':
                        $completionPercentage = 100;
                        break;
                    case 'todo':
                        $completionPercentage = 0;
                        break;
                    case 'in_progress':
                        // Only change if coming from todo or completed
                        if ($oldStatus === 'todo' || $oldStatus === 'completed') {
                            $completionPercentage = 50;
                        }
                        break;
                }
            }

            Log::debug('Updating task completion percentage', [
                'task_id' => $taskId,
                'old_status' => $oldStatus,
                'new_status' => $validated['status'],
                'old_percentage' => $oldPercentage,
                'new_percentage' => $completionPercentage,
                'percentage_provided' => $isPercentageProvided,
                'provided_percentage' => $request->input('completion_percentage')
            ]);

            $validated['completion_percentage'] = $completionPercentage;
            $task->update($validated);

            // Sync assigned users if provided
            if (isset($validated['assigned_users'])) {
                $task->assignedUsers()->sync($validated['assigned_users']);
            }

            // Log status change if it changed
            if ($oldStatus !== $validated['status']) {
                $task->logActivity(
                    'status_changed',
                    "Changed status from {$oldStatus} to {$validated['status']}",
                    ['old_status' => $oldStatus, 'new_status' => $validated['status']],
                    $task->id
                );
            }

            // Log task update
            $task->logActivity(
                'task_updated',
                'Updated task details',
                $validated,
                $task->id
            );

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
        
        // Log deletion before deleting
        $task->logActivity(
            'task_deleted',
            'Task deleted: ' . $task->title,
            [],
            $task->id
        );
        
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

        // Log user assignment
        $task->logActivity(
            'user_assigned',
            "Assigned user {$user->name} to task",
            ['assigned_user_id' => $user->id],
            $task->id
        );

        return response()->json(['message' => 'User assigned successfully']);
    }

    public function unassignUser($projectId, $taskId, $userId)
    {
        $task = Task::where('project_id', $projectId)->findOrFail($taskId);
        $user = User::findOrFail($userId);
        
        $task->assignedUsers()->detach($userId);

        // Log user unassignment
        $task->logActivity(
            'user_unassigned',
            "Unassigned user {$user->name} from task",
            ['unassigned_user_id' => $userId],
            $task->id
        );

        return response()->json(['message' => 'User unassigned successfully']);
    }

    public function assignedUsers($projectId, $taskId)
    {
        $task = Task::where('project_id', $projectId)->findOrFail($taskId);
        return response()->json($task->assignedUsers);
    }
}
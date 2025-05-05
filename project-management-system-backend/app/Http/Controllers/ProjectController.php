<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::where('user_id', auth()->id())->get();
        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:pending,in_progress,completed',
            'total_budget' => 'nullable|numeric|min:0',
            'actual_expenditure' => 'nullable|numeric|min:0',
        ]);

        $project = Project::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'],
            'user_id' => auth()->id(),
            'total_budget' => $validated['total_budget'] ?? 0,
            'actual_expenditure' => $validated['actual_expenditure'] ?? 0,
        ]);

        return response()->json($project, 201);
    }

    public function show($id)
    {
        try {
            // Get project with all necessary relationships
            $project = Project::with([
                'teamMembers',
                'tasks' => function($query) {
                    $query->with(['assignedUsers', 'comments.user']);
                },
                'user'
            ])->findOrFail($id);
            
            // Check access
            $user = auth()->user();
            $isTeamMember = $project->teamMembers->contains('id', $user->id);
            
            if ($project->user_id !== $user->id && !$isTeamMember) {
                return response()->json([
                    'message' => 'You do not have access to this project'
                ], 403);
            }
            
            // Transform tasks to include proper assigned users
            $transformedTasks = $project->tasks->map(function ($task) {
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
                    'assignedUsers' => $task->assignedUsers,
                    'comments' => $task->comments
                ];
            });

            $response = [
                'id' => $project->id,
                'title' => $project->title,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'status' => $project->status,
                'user_id' => $project->user_id,
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at,
                'total_budget' => $project->total_budget,
                'actual_expenditure' => $project->actual_expenditure,
                'teamMembers' => $project->teamMembers,
                'tasks' => $transformedTasks,
                'owner' => $project->user,
                'current_user_role' => $project->user_id === $user->id ? 'owner' : 'team_member'
            ];
            
            return response()->json($response);
            
        } catch (\Exception $e) {
            Log::error('Project fetch error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Project not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:pending,in_progress,completed',
            'total_budget' => 'nullable|numeric|min:0',
            'actual_expenditure' => 'nullable|numeric|min:0',
        ]);

        $project->update($validated);
        return response()->json($project);
    }

    public function destroy($id)
    {
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        $project->delete();
        return response()->json(['message' => 'Project deleted successfully']);
    }

    public function getTeam($id)
    {
        $project = Project::findOrFail($id);
        return response()->json($project->teamMembers);
    }

    public function addTeamMember(Request $request, $id)
    {
        $project = Project::findOrFail($id);
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        // Check if user is already a team member
        if ($project->teamMembers()->where('user_id', $validated['user_id'])->exists()) {
            return response()->json([
                'message' => 'User is already a team member'
            ], 409);
        }

        try {
            $project->teamMembers()->attach($validated['user_id']);
            return response()->json(['message' => 'Team member added successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to add team member',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function removeTeamMember($id, $userId)
    {
        $project = Project::findOrFail($id);
        $project->teamMembers()->detach($userId);
        return response()->json(['message' => 'Team member removed successfully']);
    }

    public function getAllProjects()
    {
        $user = auth()->user();
        
        // Get projects with minimal data for listing
        $projects = Project::with(['user', 'teamMembers'])
            ->where('user_id', $user->id)
            ->orWhereHas('teamMembers', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->get()
            ->map(function ($project) use ($user) {
                return [
                    'id' => $project->id,
                    'title' => $project->title,
                    'description' => $project->description,
                    'status' => $project->status,
                    'user_id' => $project->user_id,
                    'created_at' => $project->created_at,
                    'isOwner' => $project->user_id === $user->id,
                    'role' => $project->user_id === $user->id ? 'owner' : 'team_member',
                    'owner' => $project->user
                ];
            });
        
        return response()->json($projects);
    }

    public function teamMembers(Project $project)
    {
        try {
            // Check if user has access to the project
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Get team members with their user information
            $teamMembers = $project->teamMembers()->with('user')->get();

            return response()->json([
                'team_members' => $teamMembers,
                'project_id' => $project->id
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve team members', [
                'error' => $e->getMessage(),
                'project_id' => $project->id
            ]);

            return response()->json([
                'message' => 'Failed to retrieve team members',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

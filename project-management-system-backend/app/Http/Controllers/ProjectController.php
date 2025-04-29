<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\User;

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
        ]);

        $project = Project::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'],
            'user_id' => auth()->id(),
        ]);

        return response()->json($project, 201);
    }

    public function show($id)
    {
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        return response()->json($project);
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

    public function teamMembers($id)
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
        
        // Get projects owned by user
        $ownedProjects = $user->projects;
        
        // Get projects where user is a team member
        $teamProjects = Project::whereHas('teamMembers', function($query) use ($user) {
            $query->where('user_id', $user->id);
        })->get();
        
        // Merge and return unique projects
        return response()->json(
            $ownedProjects->merge($teamProjects)->unique('id')->values()
        );
    }
}
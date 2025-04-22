<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;

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
            'name' => 'required|string|max:255',
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
}

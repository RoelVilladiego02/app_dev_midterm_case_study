<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with(['user:id,name', 'task:id,title', 'project:id,title'])
            ->orderBy('created_at', 'desc');

        if ($request->has('project_id')) {
            $project = Project::findOrFail($request->project_id);
            $query->where('project_id', $project->id);
        }

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        $activities = $query->paginate(15);

        return response()->json($activities);
    }
}

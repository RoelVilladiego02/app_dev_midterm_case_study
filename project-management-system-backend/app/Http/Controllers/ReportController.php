<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ReportController extends Controller
{
    public function projectProgress($projectId)
    {
        $project = Project::findOrFail($projectId);
        
        $tasks = Task::where('project_id', $projectId)->get();
        $totalTasks = $tasks->count();
        
        $taskStats = [
            'total' => $totalTasks,
            'todo' => $tasks->where('status', 'todo')->count(),
            'in_progress' => $tasks->where('status', 'in_progress')->count(),
            'completed' => $tasks->where('status', 'completed')->count()
        ];
        
        $progress = $totalTasks > 0 
            ? round(($taskStats['completed'] / $totalTasks) * 100, 2)
            : 0;

        return response()->json([
            'project_id' => $projectId,
            'project_name' => $project->title,
            'task_statistics' => $taskStats,
            'progress_percentage' => $progress,
            'start_date' => $project->start_date,
            'end_date' => $project->end_date,
            'status' => $project->status
        ]);
    }

    public function budgetUtilization($projectId)
    {
        $project = Project::findOrFail($projectId);
        
        $expenses = $project->expenses()
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(amount) as daily_total')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'project_id' => $projectId,
            'project_name' => $project->title,
            'total_budget' => $project->total_budget,
            'actual_expenditure' => $project->actual_expenditure,
            'remaining_budget' => $project->remaining_budget,
            'utilization_percentage' => $project->total_budget > 0 
                ? round(($project->actual_expenditure / $project->total_budget) * 100, 2)
                : 0,
            'expense_timeline' => $expenses
        ]);
    }

    public function taskAnalytics($projectId)
    {
        try {
            Log::info('Fetching task analytics', ['project_id' => $projectId]);

            $project = Project::findOrFail($projectId);

            // Get task statistics by status with error handling
            $tasksByStatus = Cache::remember("project_{$projectId}_tasks_by_status", 300, function () use ($project) {
                return Task::where('project_id', $project->id)
                    ->select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'status' => $item->status ?: 'undefined',
                            'count' => (int)$item->count,
                            'percentage' => 0 // Will be calculated below
                        ];
                    });
            });

            // Calculate percentages
            $totalTasks = $tasksByStatus->sum('count');
            $tasksByStatus->transform(function ($item) use ($totalTasks) {
                $item['percentage'] = $totalTasks > 0 
                    ? round(($item['count'] / $totalTasks) * 100, 1) 
                    : 0;
                return $item;
            });

            // Get tasks completion trend
            $completionTrend = Task::where('project_id', $project->id)
                ->where('status', 'completed')
                ->select(
                    DB::raw('DATE(updated_at) as date'),
                    DB::raw('count(*) as completed_count')
                )
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Get priority distribution
            $tasksByPriority = Task::where('project_id', $project->id)
                ->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get()
                ->map(function ($item) use ($totalTasks) {
                    return [
                        'priority' => $item->priority ?: 'undefined',
                        'count' => (int)$item->count,
                        'percentage' => $totalTasks > 0 
                            ? round(($item->count / $totalTasks) * 100, 1) 
                            : 0
                    ];
                });

            $response = [
                'project_id' => $project->id,
                'project_name' => $project->title,
                'total_tasks' => $totalTasks,
                'tasks_by_status' => $tasksByStatus,
                'tasks_by_priority' => $tasksByPriority,
                'completion_trend' => $completionTrend,
                'summary' => [
                    'completed' => $tasksByStatus->where('status', 'completed')->first()['count'] ?? 0,
                    'in_progress' => $tasksByStatus->where('status', 'in_progress')->first()['count'] ?? 0,
                    'todo' => $tasksByStatus->where('status', 'todo')->first()['count'] ?? 0
                ]
            ];

            Log::info('Task analytics fetched successfully', [
                'project_id' => $projectId,
                'total_tasks' => $totalTasks
            ]);

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('Failed to fetch task analytics', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to fetch task analytics',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}

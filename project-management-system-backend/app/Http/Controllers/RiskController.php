<?php

namespace App\Http\Controllers;

use App\Models\Risk;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Http\Requests\RiskRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RiskController extends Controller
{
    public function index($projectId)
    {
        try {
            $project = Project::findOrFail($projectId);
            
            // Check if user has access to project
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $risks = $project->risks()
                ->with(['creator:id,name', 'updater:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($risks);
        } catch (\Exception $e) {
            Log::error('Failed to fetch risks', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to fetch risks'], 500);
        }
    }

    public function store(RiskRequest $request, $projectId)
    {
        try {
            $project = Project::findOrFail($projectId);
            
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $risk = new Risk($request->validated());
            $risk->project_id = $projectId;
            $risk->created_by = Auth::id();
            $risk->save();

            return response()->json($risk->load(['creator:id,name']), 201);
        } catch (\Exception $e) {
            Log::error('Failed to create risk', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to create risk'], 500);
        }
    }

    public function update(RiskRequest $request, $projectId, $riskId)
    {
        try {
            $project = Project::findOrFail($projectId);
            $risk = Risk::findOrFail($riskId);
            
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $risk->update($request->validated() + ['updated_by' => Auth::id()]);

            return response()->json($risk->load(['creator:id,name', 'updater:id,name']));
        } catch (\Exception $e) {
            Log::error('Failed to update risk', [
                'project_id' => $projectId,
                'risk_id' => $riskId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to update risk'], 500);
        }
    }

    public function destroy($projectId, $riskId)
    {
        try {
            $project = Project::findOrFail($projectId);
            $risk = Risk::findOrFail($riskId);
            
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $risk->delete();

            return response()->json(['message' => 'Risk deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Failed to delete risk', [
                'project_id' => $projectId,
                'risk_id' => $riskId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to delete risk'], 500);
        }
    }

    public function getAnalytics($projectId)
    {
        try {
            $project = Project::findOrFail($projectId);
            
            // Replace Auth::user()->can() with direct ownership/team member check
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $risks = $project->risks;
            
            // Calculate critical risks (high severity AND high probability)
            $criticalRisks = $risks->filter(function ($risk) {
                return $risk->severity === 'high' && $risk->probability === 'high';
            });

            // Calculate high risks (high severity OR high probability, but not both)
            $highRisks = $risks->filter(function ($risk) {
                return ($risk->severity === 'high' || $risk->probability === 'high') &&
                       !($risk->severity === 'high' && $risk->probability === 'high');
            });

            // Get upcoming reviews (next 7 days)
            $upcomingReviews = $risks->filter(function ($risk) {
                if (!$risk->next_review_date) return false;
                $reviewDate = Carbon::parse($risk->next_review_date);
                return $reviewDate->lte(Carbon::now()->addDays(7)) &&
                       $risk->status !== 'resolved';
            });

            // Calculate trend based on historical data
            $trend = $this->calculateRiskTrend($risks);

            return response()->json([
                'critical_risks' => $criticalRisks->count(),
                'high_risks' => $highRisks->count(),
                'upcoming_reviews' => $upcomingReviews->values(),
                'trend' => $trend,
                'total_active' => $risks->where('status', '!=', 'resolved')->count(),
                'resolved_count' => $risks->where('status', 'resolved')->count(),
                'risk_distribution' => [
                    'severity' => [
                        'high' => $risks->where('severity', 'high')->count(),
                        'medium' => $risks->where('severity', 'medium')->count(),
                        'low' => $risks->where('severity', 'low')->count(),
                    ],
                    'status' => [
                        'identified' => $risks->where('status', 'identified')->count(),
                        'mitigating' => $risks->where('status', 'mitigating')->count(),
                        'resolved' => $risks->where('status', 'resolved')->count(),
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch risk analytics', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to fetch risk analytics'], 500);
        }
    }

    private function calculateRiskTrend($risks)
    {
        $activeRisks = $risks->where('status', '!=', 'resolved');
        $highSeverityCount = $activeRisks->filter(function ($risk) {
            return $risk->severity === 'high' || $risk->probability === 'high';
        })->count();

        $threshold = ceil($activeRisks->count() * 0.3); // 30% threshold

        if ($highSeverityCount >= $threshold) {
            return 'increasing';
        } elseif ($highSeverityCount === 0) {
            return 'decreasing';
        }
        return 'stable';
    }

    public function getTrends($projectId)
    {
        try {
            $project = Project::findOrFail($projectId);
            
            if ($project->user_id !== auth()->id() && !$project->teamMembers()->where('user_id', auth()->id())->exists()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Get risks with their history
            $risks = $project->risks()
                ->with(['creator:id,name', 'updater:id,name'])
                ->get();

            // Calculate trends
            $monthlyTrends = collect();
            $startDate = Carbon::now()->subMonths(6)->startOfMonth();
            
            for ($date = $startDate; $date <= Carbon::now(); $date->addMonth()) {
                $monthStart = $date->copy();
                $monthEnd = $date->copy()->endOfMonth();
                
                $monthlyTrends->push([
                    'month' => $monthStart->format('Y-m'),
                    'new_risks' => $risks->where('created_at', '>=', $monthStart)
                                      ->where('created_at', '<=', $monthEnd)
                                      ->count(),
                    'resolved_risks' => $risks->where('status', 'resolved')
                                           ->where('updated_at', '>=', $monthStart)
                                           ->where('updated_at', '<=', $monthEnd)
                                           ->count()
                ]);
            }

            return response()->json([
                'monthly_trends' => $monthlyTrends,
                'current_status' => [
                    'total_risks' => $risks->count(),
                    'active_risks' => $risks->whereIn('status', ['identified', 'mitigating'])->count(),
                    'resolved_risks' => $risks->where('status', 'resolved')->count()
                ],
                'severity_distribution' => $risks->groupBy('severity')->map->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch risk trends', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            return response()->json(['message' => 'Failed to fetch risk trends'], 500);
        }
    }
}

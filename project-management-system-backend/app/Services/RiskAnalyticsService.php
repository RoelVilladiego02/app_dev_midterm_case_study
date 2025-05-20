<?php

namespace App\Services;

use App\Models\Risk;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RiskAnalyticsService
{
    public function getProjectRiskAnalytics($projectId)
    {
        try {
            // Use caching to improve performance
            return Cache::remember("risk_analytics_{$projectId}", 300, function () use ($projectId) {
                $risks = Risk::where('project_id', $projectId)->get();
                
                // Get current risk counts
                $criticalRisks = $risks->filter(function ($risk) {
                    return $risk->severity === 'high' && $risk->probability === 'high';
                })->count();

                $highRisks = $risks->filter(function ($risk) {
                    return ($risk->severity === 'high' || $risk->probability === 'high') 
                        && $risk->status !== 'resolved';
                })->count();

                // Calculate risk trend
                $previousMonth = Carbon::now()->subMonth();
                $historicalRisks = Risk::where('project_id', $projectId)
                    ->where('created_at', '<=', $previousMonth)
                    ->get();

                $trend = $this->calculateRiskTrend($risks, $historicalRisks);

                // Get upcoming reviews
                $upcomingReviews = $risks->filter(function ($risk) {
                    return $risk->next_review_date 
                        && Carbon::parse($risk->next_review_date)->lte(Carbon::now()->addDays(7))
                        && $risk->status !== 'resolved';
                })->values();

                // Get trend data for the last 6 months
                $trendData = $this->getMonthlyRiskTrend($projectId);

                return [
                    'critical_risks' => $criticalRisks,
                    'high_risks' => $highRisks,
                    'risks_by_status' => $this->getRisksByStatus($risks),
                    'risks_by_severity' => $this->getRisksBySeverity($risks),
                    'risk_trend' => $trend,
                    'upcoming_reviews' => $upcomingReviews,
                    'trend_data' => $trendData,
                    'last_updated' => Carbon::now()->toDateTimeString()
                ];
            });
        } catch (\Exception $e) {
            Log::error('Failed to generate risk analytics', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function calculateRiskTrend($currentRisks, $historicalRisks)
    {
        $currentRiskScore = $this->calculateRiskScore($currentRisks);
        $historicalRiskScore = $this->calculateRiskScore($historicalRisks);
        $difference = $currentRiskScore - $historicalRiskScore;
        
        return [
            'trend' => $difference > 2 ? 'increasing' : ($difference < -2 ? 'decreasing' : 'stable'),
            'current_score' => $currentRiskScore,
            'previous_score' => $historicalRiskScore,
            'difference' => $difference
        ];
    }

    private function calculateRiskScore($risks)
    {
        return $risks->sum(function ($risk) {
            if ($risk->status === 'resolved') return 0;
            
            $severityScore = ['low' => 1, 'medium' => 2, 'high' => 3][$risk->severity] ?? 1;
            $probabilityScore = ['low' => 1, 'medium' => 2, 'high' => 3][$risk->probability] ?? 1;
            
            return $severityScore * $probabilityScore;
        });
    }

    private function getMonthlyRiskTrend($projectId)
    {
        $sixMonthsAgo = Carbon::now()->subMonths(6)->startOfMonth();
        
        return Risk::where('project_id', $projectId)
            ->where('created_at', '>=', $sixMonthsAgo)
            ->get()
            ->groupBy(function ($risk) {
                return Carbon::parse($risk->created_at)->format('Y-m');
            })
            ->map(function ($monthRisks) {
                return [
                    'total' => $monthRisks->count(),
                    'score' => $this->calculateRiskScore($monthRisks),
                    'resolved' => $monthRisks->where('status', 'resolved')->count()
                ];
            });
    }

    private function getRisksByStatus($risks)
    {
        return $risks->groupBy('status')->map->count();
    }

    private function getRisksBySeverity($risks)
    {
        return $risks->groupBy('severity')->map->count();
    }
}

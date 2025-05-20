<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Risk extends Model
{
    protected $fillable = [
        'title',
        'description',
        'severity',
        'probability',
        'status',
        'mitigation_plan',
        'impact_score',
        'risk_rating',
        'status_history',
        'last_review_date',
        'next_review_date'
    ];

    protected $casts = [
        'status_history' => 'array',
        'last_review_date' => 'datetime',
        'next_review_date' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function updateStatus(string $newStatus): void
    {
        $oldStatus = $this->status;
        $this->status = $newStatus;
        
        $history = $this->status_history ?? [];
        $history[] = [
            'from' => $oldStatus,
            'to' => $newStatus,
            'date' => now()->toDateTimeString(),
            'user_id' => auth()->id()
        ];
        
        $this->status_history = $history;
        $this->save();
    }

    public function calculateImpactScore(): int
    {
        $severityScores = ['low' => 1, 'medium' => 2, 'high' => 3];
        $probabilityScores = ['low' => 1, 'medium' => 2, 'high' => 3];
        return $severityScores[$this->severity] * $probabilityScores[$this->probability];
    }

    public function calculateRiskRating(): string
    {
        $impactScore = $this->calculateImpactScore();
        if ($impactScore >= 6) return 'Critical';
        if ($impactScore >= 4) return 'High';
        if ($impactScore >= 2) return 'Medium';
        return 'Low';
    }
}

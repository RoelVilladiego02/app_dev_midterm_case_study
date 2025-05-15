<?php

namespace App\Models;

use App\Traits\LogsActivityTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory, LogsActivityTrait;

    protected $fillable = [
        'title', 
        'description',
        'user_id',
        'start_date',
        'end_date',
        'status',
        'total_budget',
        'actual_expenditure',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    // Renamed the function to match what's being used in the controllers
    public function teamMembers()
    {
        return $this->belongsToMany(User::class, 'project_user', 'project_id', 'user_id')->withTimestamps();
    }
    
    // Add an alias method to support the team() calls in TaskController
    public function team()
    {
        return $this->teamMembers();
    }

    public function getRemainingBudgetAttribute()
    {
        return $this->total_budget - $this->actual_expenditure;
    }

    public function canAddExpenditure($amount)
    {
        return ($this->actual_expenditure + $amount) <= $this->total_budget;
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function calculateActualExpenditure()
    {
        return $this->expenses()->sum('amount');
    }

    public function updateExpenditure()
    {
        $this->actual_expenditure = $this->calculateActualExpenditure();
        $this->save();
    }
}
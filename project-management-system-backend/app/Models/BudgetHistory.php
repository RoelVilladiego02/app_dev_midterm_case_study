<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BudgetHistory extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'amount',
        'total_budget_after',
        'description',
        'user_id'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

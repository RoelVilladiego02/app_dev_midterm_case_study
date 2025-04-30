<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'amount',
        'description'
    ];

    protected $casts = [
        'amount' => 'decimal:2'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}

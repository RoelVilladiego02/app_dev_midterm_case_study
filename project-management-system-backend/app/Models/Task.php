<?php

namespace App\Models;

use App\Traits\LogsActivityTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory, LogsActivityTrait;

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'due_date',
        'project_id',
        'completion_percentage'
    ];

    protected $casts = [
        'due_date' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'task_user', 'task_id', 'user_id')->withTimestamps();
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class)->with('user');
    }

    public function files()
    {
        return $this->hasMany(TaskFile::class);
    }

    public function isAssignedUser(User $user)
    {
        return $this->assignedUsers()->where('users.id', $user->id)->exists();
    }
}

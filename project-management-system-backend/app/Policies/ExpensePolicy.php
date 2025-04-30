<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Expense;
use App\Models\Project;

class ExpensePolicy
{
    public function create(User $user, Project $project)
    {
        return $user->id === $project->user_id || 
               $project->teamMembers()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Expense $expense)
    {
        return $user->id === $expense->project->user_id;
    }
}

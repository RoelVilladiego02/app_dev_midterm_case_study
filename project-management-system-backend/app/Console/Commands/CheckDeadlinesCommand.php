<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Task;
use App\Models\Project;
use App\Notifications\TaskDueSoonNotification;
use App\Notifications\ProjectDeadlineNotification;
use App\Notifications\LowBudgetNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckDeadlinesCommand extends Command
{
    protected $signature = 'check:deadlines';
    protected $description = 'Check tasks and projects for approaching deadlines';

    public function handle()
    {
        try {
            // Check tasks due in 3 days
            $tasks = Task::where('due_date', '>', Carbon::now())
                ->where('due_date', '<=', Carbon::now()->addDays(3))
                ->where('status', '!=', 'completed')
                ->with(['assignedUsers', 'project'])
                ->get();

            foreach ($tasks as $task) {
                $daysRemaining = Carbon::now()->diffInDays($task->due_date);
                
                foreach ($task->assignedUsers as $user) {
                    $user->notify(new TaskDueSoonNotification($task, $daysRemaining));
                }
            }

            // Check projects ending in 7 days
            $projects = Project::where('end_date', '>', Carbon::now())
                ->where('end_date', '<=', Carbon::now()->addDays(7))
                ->where('status', '!=', 'completed')
                ->with(['user'])
                ->get();

            foreach ($projects as $project) {
                $daysRemaining = Carbon::now()->diffInDays($project->end_date);
                
                if ($project->user) {
                    $project->user->notify(new ProjectDeadlineNotification($project, $daysRemaining));
                }

                // Check budget if less than 20%
                if ($project->total_budget > 0) {
                    $remainingBudget = $project->total_budget - $project->actual_expenditure;
                    $remainingPercentage = ($remainingBudget / $project->total_budget) * 100;
                    
                    if ($remainingPercentage <= 20) {
                        $project->user->notify(new LowBudgetNotification($project, $remainingPercentage));
                    }
                }
            }

            Log::info('Deadline check completed successfully');
            $this->info('Deadline check completed successfully');

        } catch (\Exception $e) {
            Log::error('Deadline check failed', ['error' => $e->getMessage()]);
            $this->error('Deadline check failed: ' . $e->getMessage());
        }
    }
}

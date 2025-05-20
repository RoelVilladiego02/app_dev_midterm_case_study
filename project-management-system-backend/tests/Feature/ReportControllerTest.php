<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use App\Models\Expense;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReportControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->project = Project::factory()->create([
            'user_id' => $this->user->id,
            'total_budget' => 1000
        ]);
        
        Sanctum::actingAs($this->user);
    }

    public function test_project_progress_report()
    {
        Task::factory()->count(2)->create([
            'project_id' => $this->project->id,
            'status' => 'completed'
        ]);
        
        Task::factory()->count(2)->create([
            'project_id' => $this->project->id,
            'status' => 'in_progress'
        ]);

        $response = $this->getJson("/api/reports/projects/{$this->project->id}/progress");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_id',
                'project_name',
                'task_statistics' => [
                    'total',
                    'todo',
                    'in_progress',
                    'completed'
                ],
                'progress_percentage'
            ]);
    }

    public function test_budget_utilization_report()
    {
        Expense::factory()->count(3)->create([
            'project_id' => $this->project->id,
            'amount' => 100
        ]);

        $response = $this->getJson("/api/reports/projects/{$this->project->id}/budget");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_id',
                'project_name',
                'total_budget',
                'actual_expenditure',
                'remaining_budget',
                'utilization_percentage',
                'expense_timeline'
            ]);
    }

    public function test_task_analytics_report()
    {
        Task::factory()->count(5)->create([
            'project_id' => $this->project->id,
            'priority' => 'high'
        ]);

        $response = $this->getJson("/api/reports/projects/{$this->project->id}/tasks");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_id',
                'project_name',
                'tasks_by_priority',
                'tasks_by_status',
                'task_creation_timeline'
            ]);
    }
}

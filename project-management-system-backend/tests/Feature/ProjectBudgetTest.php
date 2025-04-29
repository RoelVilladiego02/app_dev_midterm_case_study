<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProjectBudgetTest extends TestCase
{
    use RefreshDatabase;

    private $user;
    private $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->project = Project::factory()->create([
            'user_id' => $this->user->id,
            'total_budget' => 10000,
            'actual_expenditure' => 0
        ]);
    }

    public function test_can_get_budget()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/projects/{$this->project->id}/budget");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_budget',
                'actual_expenditure',
                'remaining_budget'
            ]);
    }

    public function test_can_update_budget()
    {
        $response = $this->actingAs($this->user)
            ->putJson("/api/projects/{$this->project->id}/budget", [
                'total_budget' => 20000
            ]);

        $response->assertStatus(200);
        $this->assertEquals(20000, $this->project->fresh()->total_budget);
    }

    public function test_cannot_add_expenditure_exceeding_budget()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/projects/{$this->project->id}/expenditures", [
                'amount' => 15000,
                'description' => 'Test expenditure'
            ]);

        $response->assertStatus(422);
    }
}

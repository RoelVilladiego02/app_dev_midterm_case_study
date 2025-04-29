<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_assign_user_to_task()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        $task = Task::factory()->create(['project_id' => $project->id]);
        $assignee = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks/{$task->id}/assign", [
                'user_id' => $assignee->id
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id
        ]);
    }

    public function test_can_unassign_user_from_task()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        $task = Task::factory()->create(['project_id' => $project->id]);
        $assignee = User::factory()->create();
        $task->assignedUsers()->attach($assignee->id);

        $response = $this->actingAs($user)
            ->deleteJson("/api/projects/{$project->id}/tasks/{$task->id}/users/{$assignee->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id
        ]);
    }
}

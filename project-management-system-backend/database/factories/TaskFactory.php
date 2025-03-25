<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    public function definition()
    {
        return [
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'priority' => fake()->randomElement(['low', 'medium', 'high']),
            'status' => fake()->randomElement(['todo', 'in_progress', 'completed']),
            'due_date' => fake()->dateTimeBetween('now', '+3 months'),
        ];
    }
}

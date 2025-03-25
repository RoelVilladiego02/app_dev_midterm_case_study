<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    public function definition()
    {
        return [
            'name' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'user_id' => User::factory(),
            'start_date' => fake()->dateTimeBetween('-1 month', '+1 month'),
            'end_date' => fake()->dateTimeBetween('+2 months', '+6 months'),
            'status' => fake()->randomElement(['pending', 'in_progress', 'completed']),
        ];
    }
}

<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run()
    {
        $projects = Project::all();
        $users = User::all();

        $projects->each(function ($project) use ($users) {
            Task::factory(rand(3, 8))->create([
                'project_id' => $project->id,
                'user_id' => $users->random()->id
            ]);
        });
    }
}

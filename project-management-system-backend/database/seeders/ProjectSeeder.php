<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run()
    {
        $users = User::all();
        
        if ($users->count() === 0) {
            User::factory(3)->create();
            $users = User::all();
        }

        $users->each(function ($user) {
            Project::factory(rand(2, 5))->create([
                'user_id' => $user->id
            ]);
        });
    }
}

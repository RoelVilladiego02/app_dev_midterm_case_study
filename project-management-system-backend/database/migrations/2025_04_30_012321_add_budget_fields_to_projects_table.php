<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            //
        });
        Schema::table('tasks', function (Blueprint $table) {
            // Add indexes for better analytics performance
            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'priority']);
            $table->index(['project_id', 'updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            //
        });
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'status']);
            $table->dropIndex(['project_id', 'priority']);
            $table->dropIndex(['project_id', 'updated_at']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRisksTable extends Migration
{
    public function up()
    {
        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high']);
            $table->enum('probability', ['low', 'medium', 'high']);
            $table->enum('status', ['identified', 'mitigating', 'resolved']);
            $table->text('mitigation_plan');
            $table->integer('impact_score');
            $table->string('risk_rating');
            $table->json('status_history')->nullable();
            $table->timestamp('last_review_date')->nullable();
            $table->timestamp('next_review_date')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['project_id', 'severity', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('risks');
    }
}

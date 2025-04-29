<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBudgetFieldsToProjects extends Migration
{
    public function up()
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('total_budget', 15, 2)->nullable(false)->default(0);
            $table->decimal('actual_expenditure', 15, 2)->default(0);
        });
    }

    public function down()
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['total_budget', 'actual_expenditure']);
        });
    }
}

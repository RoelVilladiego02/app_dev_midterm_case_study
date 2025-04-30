<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function index(Project $project)
    {
        return response()->json($project->expenses()->paginate(10));
    }

    public function store(Request $request, Project $project)
    {
        try {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0',
                'description' => 'required|string|max:255'
            ]);

            if (!$project->canAddExpenditure($validated['amount'])) {
                return response()->json(['message' => 'Amount exceeds remaining budget'], 422);
            }

            DB::beginTransaction();
            
            $expense = $project->expenses()->create($validated);
            $project->updateExpenditure();
            
            DB::commit();

            return response()->json([
                'message' => 'Expense added successfully',
                'expense' => $expense,
                'project_budget' => [
                    'total_budget' => $project->total_budget,
                    'actual_expenditure' => $project->actual_expenditure,
                    'remaining_budget' => $project->remaining_budget
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to add expense'], 500);
        }
    }

    public function destroy(Project $project, Expense $expense)
    {
        try {
            DB::beginTransaction();
            
            $expense->delete();
            $project->updateExpenditure();
            
            DB::commit();

            return response()->json([
                'message' => 'Expense deleted successfully',
                'project_budget' => [
                    'total_budget' => $project->total_budget,
                    'actual_expenditure' => $project->actual_expenditure,
                    'remaining_budget' => $project->remaining_budget
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete expense'], 500);
        }
    }
}

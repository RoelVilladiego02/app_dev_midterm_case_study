<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\BudgetHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectBudgetController extends Controller
{
    public function getBudget(Project $project)
    {
        return response()->json([
            'total_budget' => $project->total_budget,
            'actual_expenditure' => $project->actual_expenditure,
            'remaining_budget' => $project->remaining_budget,
        ]);
    }

    public function updateBudget(Request $request, Project $project)
    {
        $validated = $request->validate([
            'total_budget' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:255'
        ]);

        try {
            DB::beginTransaction();

            $oldBudget = $project->total_budget;
            $newBudget = $validated['total_budget'];
            $difference = $newBudget - $oldBudget;

            if ($difference > 0) {
                BudgetHistory::create([
                    'project_id' => $project->id,
                    'amount' => $difference,
                    'total_budget_after' => $newBudget,
                    'description' => $validated['description'] ?? 'Budget increase',
                    'user_id' => auth()->id()
                ]);
            }

            $project->update([
                'total_budget' => $newBudget
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Budget updated successfully',
                'total_budget' => $project->total_budget,
                'actual_expenditure' => $project->actual_expenditure,
                'remaining_budget' => $project->remaining_budget,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update budget'], 500);
        }
    }

    public function addExpenditure(Request $request, Project $project)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string',
        ]);

        if (!$project->canAddExpenditure($validated['amount'])) {
            return response()->json([
                'message' => 'Expenditure amount exceeds remaining budget'
            ], 422);
        }

        $project->actual_expenditure += $validated['amount'];
        $project->save();

        return response()->json([
            'message' => 'Expenditure added successfully',
            'total_budget' => $project->total_budget,
            'actual_expenditure' => $project->actual_expenditure,
            'remaining_budget' => $project->remaining_budget,
        ]);
    }

    public function getBudgetHistory(Project $project)
    {
        $history = BudgetHistory::where('project_id', $project->id)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }
}

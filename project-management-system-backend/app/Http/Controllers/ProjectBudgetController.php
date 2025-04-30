<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

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
        ]);

        $project->update([
            'total_budget' => $validated['total_budget'],
        ]);

        return response()->json([
            'message' => 'Budget updated successfully',
            'total_budget' => $project->total_budget,
            'actual_expenditure' => $project->actual_expenditure,
            'remaining_budget' => $project->remaining_budget,
        ]);
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
}

<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectBudgetController extends Controller
{
    public function getBudget(Project $project)
    {
        return response()->json([
            'total_budget' => $project->total_budget,
            'actual_expenditure' => $project->actual_expenditure,
            'remaining_budget' => $project->remaining_budget
        ]);
    }

    public function updateBudget(Request $request, Project $project)
    {
        $validator = Validator::make($request->all(), [
            'total_budget' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $project->update(['total_budget' => $request->total_budget]);

        return response()->json(['message' => 'Budget updated successfully']);
    }

    public function addExpenditure(Request $request, Project $project)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!$project->canAddExpenditure($request->amount)) {
            return response()->json(['error' => 'Expenditure exceeds budget limit'], 422);
        }

        $project->actual_expenditure += $request->amount;
        $project->save();

        return response()->json(['message' => 'Expenditure logged successfully']);
    }
}

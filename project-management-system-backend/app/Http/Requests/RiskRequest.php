<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RiskRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'severity' => 'required|in:low,medium,high',
            'probability' => 'required|in:low,medium,high',
            'status' => 'required|in:identified,mitigating,resolved',
            'mitigation_plan' => 'nullable|string'
        ];
    }
}

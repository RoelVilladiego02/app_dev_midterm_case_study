<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        // Fetch all users except the authenticated user
        $users = User::where('id', '!=', auth()->id())->get();
        return response()->json($users);
    }
}

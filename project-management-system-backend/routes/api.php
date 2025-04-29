<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProjectBudgetController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TeamInvitationController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [LoginController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [LogoutController::class, 'logout']);

    // Project routes
    Route::get('/projects/all', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    
    // Budget management routes
    Route::get('/projects/{project}/budget', [ProjectBudgetController::class, 'getBudget']);
    Route::put('/projects/{project}/budget', [ProjectBudgetController::class, 'updateBudget']);
    Route::post('/projects/{project}/expenditures', [ProjectBudgetController::class, 'addExpenditure']);

    // Task routes
    Route::get('/projects/{project}/tasks', [TaskController::class, 'index']);
    Route::post('/projects/{project}/tasks', [TaskController::class, 'store']);
    Route::get('/projects/{project}/tasks/{task}', [TaskController::class, 'show']);
    Route::put('/projects/{project}/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/projects/{project}/tasks/{task}', [TaskController::class, 'destroy']);
    
    // Task assignment routes
    Route::post('/projects/{project}/tasks/{task}/assign', [TaskController::class, 'assignUser']);
    Route::delete('/projects/{project}/tasks/{task}/unassign/{user}', [TaskController::class, 'unassignUser']);
    Route::get('/projects/{project}/tasks/{task}/users', [TaskController::class, 'assignedUsers']);
    
    // Team routes
    Route::get('/projects/{project}/team', [ProjectController::class, 'teamMembers']);
    Route::post('/projects/{project}/team', [ProjectController::class, 'addTeamMember']);
    Route::delete('/projects/{project}/team/{user}', [ProjectController::class, 'removeTeamMember']);

    // Team invitation routes
    Route::post('projects/{project}/invitations', [TeamInvitationController::class, 'store']);
    Route::post('invitations/{invitation}/respond', [TeamInvitationController::class, 'respond']);
    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('notifications/{id}', [NotificationController::class, 'markAsHandled']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

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
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskFileController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ReportController;

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

    // Add new route for available users
    Route::get('/users/available', [UserController::class, 'getAvailableUsers']);

    // Project routes
    Route::get('/projects/getAllProjects', [ProjectController::class, 'getAllProjects']);
    Route::get('/projects/all', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    
    // Budget management routes
    Route::get('/projects/{project}/budget', [ProjectBudgetController::class, 'getBudget']);
    Route::put('/projects/{project}/budget', [ProjectBudgetController::class, 'updateBudget']);
    Route::get('/projects/{project}/budget/history', [ProjectBudgetController::class, 'getBudgetHistory']);
    Route::post('/projects/{project}/budget/expenditure', [ProjectBudgetController::class, 'addExpenditure']);

    // Expense routes
    Route::get('/projects/{project}/expenses', [ExpenseController::class, 'index']);
    Route::post('/projects/{project}/expenses', [ExpenseController::class, 'store']);
    Route::delete('/projects/{project}/expenses/{expense}', [ExpenseController::class, 'destroy']);

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
    
    // Task Comment routes
    Route::get('/tasks/{task}/comments', [TaskCommentController::class, 'index']);
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store']);
    Route::delete('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy']);
    
    // Task File routes
    Route::get('/tasks/{task}/files', [TaskFileController::class, 'index']);
    Route::post('/tasks/{task}/files', [TaskFileController::class, 'store']);
    Route::get('/tasks/{task}/files/{file}', [TaskFileController::class, 'show'])->name('tasks.files.download');
    Route::delete('/tasks/{task}/files/{file}', [TaskFileController::class, 'destroy']);
    
    // Team routes
    Route::get('/projects/{project}/team', [ProjectController::class, 'teamMembers']);
    Route::post('/projects/{project}/team', [ProjectController::class, 'addTeamMember']);
    Route::delete('/projects/{project}/team/{user}', [ProjectController::class, 'removeTeamMember']);

    // Team invitation routes
    Route::post('projects/{projectId}/invitations', [TeamInvitationController::class, 'store']);
    Route::get('invitations/{id}', [TeamInvitationController::class, 'show']);
    Route::post('invitations/{id}/respond', [TeamInvitationController::class, 'respond']);
    Route::get('projects/{projectId}/invitations', [TeamInvitationController::class, 'getProjectInvitations']);
    Route::post('invitations/{id}/cancel', [TeamInvitationController::class, 'cancelInvitation']);
    
    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread', [NotificationController::class, 'unread']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('notifications/{id}', [NotificationController::class, 'markAsHandled']);
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('notifications/cleanup', [NotificationController::class, 'cleanupStaleNotifications']);

    // Activity feed routes
    Route::get('/activity-feed', [ActivityLogController::class, 'index']);

    // Report routes
    Route::get('/reports/projects/{project}/progress', [ReportController::class, 'projectProgress']);
    Route::get('/reports/projects/{project}/budget', [ReportController::class, 'budgetUtilization']);
    Route::get('/reports/projects/{project}/tasks', [ReportController::class, 'taskAnalytics']);
    Route::get('/projects/{project}/analytics/tasks', [ReportController::class, 'taskAnalytics']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
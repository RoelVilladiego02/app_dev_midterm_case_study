<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskFile;
use App\Notifications\TaskFileUploadNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class TaskFileController extends Controller
{
    private $allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ];

    private $maxFileSize = 5242880; // 5MB in bytes

    public function index(Task $task)
    {
        return response()->json($task->files()->with('uploader:id,name')->get());
    }

    public function store(Request $request, Task $task)
    {
        try {
            if (!$request->hasFile('file')) {
                return response()->json(['message' => 'No file uploaded'], 400);
            }

            $file = $request->file('file');
            $currentUser = auth()->user();
            $project = $task->project;

            // Validate file
            if (!in_array($file->getMimeType(), $this->allowedMimeTypes)) {
                return response()->json(['message' => 'Invalid file type'], 422);
            }

            if ($file->getSize() > $this->maxFileSize) {
                return response()->json(['message' => 'File size exceeds 5MB limit'], 422);
            }

            // Generate unique filename
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('task_files/' . $task->id, $fileName, 'local');

            // Create database record
            $taskFile = $task->files()->create([
                'uploaded_by' => $currentUser->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $filePath,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize()
            ]);

            // Send notifications
            if ($currentUser->id !== $project->user_id) {
                // Notify project owner if uploader is not owner
                $project->user->notify(new TaskFileUploadNotification(
                    $task,
                    $project,
                    $currentUser,
                    $file->getClientOriginalName()
                ));
            }

            // Notify other assigned users
            $task->assignedUsers()
                ->where('users.id', '!=', $currentUser->id)
                ->get()
                ->each(function ($user) use ($task, $project, $currentUser, $file) {
                    $user->notify(new TaskFileUploadNotification(
                        $task,
                        $project,
                        $currentUser,
                        $file->getClientOriginalName()
                    ));
                });

            return response()->json([
                'message' => 'File uploaded successfully',
                'file' => $taskFile->load('uploader:id,name')
            ], 201);

        } catch (\Exception $e) {
            Log::error('File upload failed', [
                'error' => $e->getMessage(),
                'task_id' => $task->id
            ]);

            return response()->json([
                'message' => 'Failed to upload file'
            ], 500);
        }
    }

    public function show(Task $task, TaskFile $file)
    {
        if (!Storage::disk('local')->exists($file->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $filePath = storage_path('app/' . $file->file_path);
        
        if (!file_exists($filePath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return response()->download(
            $filePath,
            $file->file_name,
            ['Content-Type' => $file->mime_type]
        );
    }

    public function destroy(Task $task, TaskFile $file)
    {
        try {
            // Check if user is authorized
            if ($file->uploaded_by !== auth()->id() && $task->project->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized to delete this file'], 403);
            }

            // Delete file from storage
            if (Storage::disk('local')->exists($file->file_path)) {
                Storage::disk('local')->delete($file->file_path);
            }

            // Delete database record
            $file->delete();

            return response()->json(['message' => 'File deleted successfully']);

        } catch (\Exception $e) {
            Log::error('File deletion failed', [
                'error' => $e->getMessage(),
                'file_id' => $file->id
            ]);

            return response()->json(['message' => 'Failed to delete file'], 500);
        }
    }
}

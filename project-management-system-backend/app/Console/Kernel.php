<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;
use App\Jobs\MonitorProjectRisks;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('check:deadlines')
            ->daily()
            ->at('09:00')
            ->onSuccess(function () {
                Log::info('Deadline check scheduled task completed successfully');
            })
            ->onFailure(function () {
                Log::error('Deadline check scheduled task failed');
            });

        // Add risk monitoring job
        $schedule->job(new MonitorProjectRisks)
            ->daily()
            ->at('10:00')
            ->onSuccess(function () {
                Log::info('Risk monitoring completed successfully');
            })
            ->onFailure(function () {
                Log::error('Risk monitoring failed');
            });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

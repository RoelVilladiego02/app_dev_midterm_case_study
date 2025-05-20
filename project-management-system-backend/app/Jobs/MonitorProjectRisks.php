<?php

namespace App\Jobs;

use App\Models\Risk;
use App\Notifications\RiskReviewDueNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class MonitorProjectRisks implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle()
    {
        Risk::query()
            ->where('status', '!=', 'resolved')
            ->where('next_review_date', '<=', now()->addDays(2))
            ->with(['project.user'])
            ->chunk(100, function ($risks) {
                foreach ($risks as $risk) {
                    $risk->project->user->notify(
                        new RiskReviewDueNotification($risk)
                    );
                }
            });
    }
}

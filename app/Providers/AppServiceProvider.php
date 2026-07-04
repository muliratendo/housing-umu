<?php

namespace App\Providers;

use App\Models\Room;
use App\Policies\RoomPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL; // 👈 1. Import the URL facade
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
       //
        $this->app->singleton(
            \App\Services\OccupancyMetricsService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Room::class, RoomPolicy::class);

        // Force secure HTTPS asset generation whenever running behind Render's secure load balancers
        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            URL::forceScheme('https');
        }
        Vite::prefetch(concurrency: 3);

        \App\Models\Allocation::observe(\App\Observers\AllocationObserver::class);
    }
}

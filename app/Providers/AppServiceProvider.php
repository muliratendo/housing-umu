<?php

namespace App\Providers;

use App\Models\HousingUnit;
use App\Observers\HousingUnitObserver;
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
        HousingUnit::observe(HousingUnitObserver::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force secure HTTPS asset generation whenever running behind Render's secure load balancers
        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            URL::forceScheme('https');
        }
        Vite::prefetch(concurrency: 3);
    }
}

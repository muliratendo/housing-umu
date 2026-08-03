<?php

use App\Services\OccupancyMetricsService;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicHostelController;
use App\Http\Controllers\Student\{
    DashboardController,
    ApplicationController,
    AllocationController,
    HostelController,
    MaintenanceController,
};
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC UI ROUTES (Unauthenticated Space)
|--------------------------------------------------------------------------
*/
Route::get('/', function (OccupancyMetricsService $occupancy) {
    return Inertia::render('Public/Welcome', [
        'canLogin'          => Route::has('login'),
        'canRegister'       => Route::has('register'),
        'laravelVersion'    => Application::VERSION,
        'phpVersion'        => PHP_VERSION,
        'occupancySnapshot' => $occupancy->landingSnapshot(),
    ]);
})->name('welcome');

Route::prefix('hostels')->name('public.hostels.')->group(function () {
    Route::get('/', [PublicHostelController::class, 'index'])->name('index');
    Route::get('/{hostel:slug}', [PublicHostelController::class, 'show'])->name('show');
});

Route::get('/how-it-works', function () {
    return Inertia::render('Public/HowItWorks');
})->name('public.how-it-works');

Route::get('/get-help', function () {
    return Inertia::render('Public/Support');
})->name('public.support');


/*
|--------------------------------------------------------------------------
| 2. SHARED AUTHENTICATION PORTS
|--------------------------------------------------------------------------
*/
require __DIR__.'/auth.php';


/*
|--------------------------------------------------------------------------
| 3. STUDENT PORTAL UI ROUTES (Requires Auth + Verified + Student Role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'role:student|student_leader'])
    ->prefix('student')
    ->name('student.')
    ->group(function () {

    // S1 — Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    // S2 / S3 — Hostel Browsing
    Route::get('/hostels', [HostelController::class, 'index'])
        ->name('hostels.index');
    Route::get('/hostels/{hostel:slug}', [HostelController::class, 'show'])
        ->name('hostels.show');

    // S4 / S5a / S5b — Applications
    // File: routes/web.php — student.applications group
    Route::prefix('applications')
        ->name('applications.')
        ->group(function () {
            Route::get('/', [ApplicationController::class, 'index'])
                ->name('index');
            Route::get('/create', [ApplicationController::class, 'create'])
                ->name('create');
            Route::post('/', [ApplicationController::class, 'store'])
                ->name('store');
            Route::get('/{application}', [ApplicationController::class, 'show'])
                ->name('show');
            Route::patch('/draft/{formId}', [ApplicationController::class, 'saveDraft'])
                ->name('draft.save');
            Route::get('/{application}/edit', [ApplicationController::class, 'edit'])
                ->name('edit');
            Route::get('/{application}/resume', [ApplicationController::class, 'resume'])
                ->name('resume');
            Route::delete('/{application}/draft', [ApplicationController::class, 'destroyDraft'])
                ->name('draft.destroy');
            Route::post('applications/{application}/submit', [ApplicationController::class, 'submitDraft'])
                ->name('submit');
            Route::patch('/{application}', [ApplicationController::class, 'update'])
                ->name('update');
            Route::post('/{application}/withdraw', [ApplicationController::class, 'withdraw'])
                ->name('withdraw');
            Route::post('/{application}/resubmit', [ApplicationController::class, 'resubmit'])
                ->name('resubmit');
            Route::get('/{application}/edit', [ApplicationController::class, 'edit'])
                ->name('edit');
    });

    // S6 — Allocation Status
    Route::get('/allocation', [AllocationController::class, 'show'])
        ->name('allocation.show');
    Route::post('/allocation/{allocation}/check-in', [AllocationController::class, 'checkIn'])
        ->name('allocation.check-in');
    Route::post('/allocation/request/{type}', [AllocationController::class, 'requestAction'])
        ->name('allocation.request');

    // S7 / S8 / S9 — Maintenance (BR-10 enforced in controller)
    Route::get('/maintenance', [MaintenanceController::class, 'index'])
        ->name('maintenance.index');
    Route::get('/maintenance/create', [MaintenanceController::class, 'create'])
        ->name('maintenance.create');
    Route::post('/maintenance', [MaintenanceController::class, 'store'])
        ->name('maintenance.store');
    Route::get('/maintenance/{maintenanceRequest}', [MaintenanceController::class, 'show'])
        ->name('maintenance.show');
    Route::post('/maintenance/{maintenanceRequest}/comments', [MaintenanceController::class, 'addComment'])
        ->name('maintenance.comments.store');
    Route::patch('/maintenance/comments/{comment}', [MaintenanceController::class, 'updateComment'])
        ->name('maintenance.comments.update');
    Route::delete('/maintenance/comments/{comment}', [MaintenanceController::class, 'destroyComment'])
        ->name('maintenance.comments.destroy');
});


/*
|--------------------------------------------------------------------------
| 4. ADMINISTRATIVE CONTROL UI ROUTES (Requires Auth + Admin Roles)
|--------------------------------------------------------------------------
*/
require __DIR__.'/admin.php';


/*
|--------------------------------------------------------------------------
| 5. SHARED PROFILE + ROLE-BASED REDIRECT
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ── 2FA routes (PragmaRX Google2FA — activated when package is added) ─
    // Route::get('/profile/two-factor/setup', [TwoFactorController::class, 'setup'])->name('profile.2fa.setup');
    // Route::post('/profile/two-factor/enable', [TwoFactorController::class, 'enable'])->name('profile.2fa.enable');
    // Route::post('/profile/two-factor/disable', [TwoFactorController::class, 'disable'])->name('profile.2fa.disable');
    // Route::get('/profile/two-factor/recovery-codes', [TwoFactorController::class, 'recoveryCodes'])->name('profile.2fa.recovery-codes');

    // ── Passkey routes (future — WebAuthn package) ────────────────────────
    // Route::get('/profile/passkeys', [PasskeyController::class, 'index'])->name('profile.passkeys');
    // Route::post('/profile/passkeys/register', [PasskeyController::class, 'register'])->name('profile.passkeys.register');
    // Route::delete('/profile/passkeys/{passkey}', [PasskeyController::class, 'destroy'])->name('profile.passkeys.destroy');

    // ── Role-based dashboard redirect ─────────────────────────────────────
    Route::get('/dashboard', function () {
        $user = auth()->user();

        if (! $user || $user->roles->isEmpty()) {
            abort(403, 'Your account has no assigned role. Please contact the Warden\'s office.');
        }

        if ($user->hasAnyRole(['admin', 'super_admin', 'warden', 'dean', 'affiliated_admin'])) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->hasAnyRole(['student', 'student_leader'])) {
            return redirect()->route('student.dashboard');
        }

        abort(403, 'Your account role is not recognized by the system. Contact Support');
    })->name('dashboard');
});

// ── Google OAuth (Laravel Socialite — activated when package is added) ───────
// Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
// Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

/*
|--------------------------------------------------------------------------
| 6. POLICY / LEGAL PUBLIC PAGES
|--------------------------------------------------------------------------
*/
Route::name('policy.')->group(function () {
    Route::get('/privacy', function () {
        return Inertia::render('Policy/Privacy');
    })->name('privacy');

    Route::get('/terms', function () {
        return Inertia::render('Policy/Terms');
    })->name('terms');

    Route::get('/cookie-policy', function () {
        return Inertia::render('Policy/Cookie');
    })->name('cookie');
});

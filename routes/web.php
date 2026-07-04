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
use App\Http\Controllers\Admin\{
    RoomController,
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
Route::middleware(['auth', 'verified', 'role:student'])
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
    Route::get('/applications', [ApplicationController::class, 'index'])
        ->name('applications.index');
    Route::get('/applications/create', [ApplicationController::class, 'create'])
        ->name('applications.create');
    Route::post('/applications', [ApplicationController::class, 'store'])
        ->name('applications.store');
    Route::get('/applications/{application}', [ApplicationController::class, 'show'])
        ->name('applications.show');
    Route::patch('/applications/draft/{formId}', [ApplicationController::class, 'saveDraft'])
        ->name('applications.draft');

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
Route::middleware(['auth', 'role:admin|super_admin|warden|dean'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('dashboard');

    Route::resource('rooms', RoomController::class)->only(['show']);
        Route::post('rooms/{room}/toggle-capacity', [RoomController::class, 'toggleCapacity'])
            ->name('rooms.toggle-capacity');
        Route::get('rooms/{room}/beds', [RoomController::class, 'beds'])
            ->name('rooms.beds');
        Route::patch('beds/{bed}/status', [RoomController::class, 'updateBedStatus'])
            ->name('beds.update-status');
});


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
        /** @var User|null $user */
        $user = auth()->user();

        if ($user && $user->hasAnyRole(['admin', 'super_admin', 'warden', 'dean'])) {
            return redirect()->route('admin.dashboard');
        }

        return redirect()->route('student.dashboard');
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

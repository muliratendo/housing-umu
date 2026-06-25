<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\PublicHostelController;
use App\Http\Controllers\PublicRoomController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\Admin\StudentVerificationController;
use App\Models\User;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC UI ROUTES (Unauthenticated Space)
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return Inertia::render('Public/Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('welcome');

// Dynamic search catalog route passing query filter requests
Route::prefix('hostels')->name('public.hostels.')->group(function () {
    Route::get('/', [PublicHostelController::class, 'index'])
        ->name('index');

    Route::get('/{hostel:slug}', [PublicHostelController::class, 'show'])
        ->name('show');
});
// Additional public marketing layout anchor content views
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
| 3. STUDENT PORTAL UI ROUTES (Requires Auth and Student Role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'role:student'])->prefix('student')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Student/Dashboard', [
            'units' => [
                [
                    'id' => 1,
                    'title' => 'Nkozi Premium Hostel',
                    'location' => 'Near UMU Main Gate, Nkozi',
                    'price' => 'UGX 650,000 / Semester'
                ],
                [
                    'id' => 2,
                    'title' => 'St. Mary’s Executive Rooms',
                    'location' => 'Kayabwe Highway Road, Nkozi',
                    'price' => 'UGX 500,000 / Semester'
                ],
                [
                    'id' => 3,
                    'title' => 'Martyrs Court Self-Contained',
                    'location' => 'Nkozi Trading Centre',
                    'price' => 'UGX 750,000 / Semester'
                ]
            ]
        ]);
    })->name('student.dashboard');

    // Application form for a specific hostel room
    Route::get(
        '/applications/create',
        [ApplicationController::class, 'create']
    )->name('applications.create');
});


/*
|--------------------------------------------------------------------------
| 4. ADMINISTRATIVE CONTROL UI ROUTES (Requires Auth and Admin Roles)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'role:admin|super_admin|warden|dean'])->prefix('admin')->group(function () {

    // Core Administrative Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('admin.dashboard');

    Route::get('/verifications', [ApprovalController::class, 'index'])->name('admin.verifications');

    // 🚀 Complete Interactive Student Spreadsheet Verification Management Suite
    Route::get('/student-verification', [StudentVerificationController::class, 'index'])->name('admin.verifications.index');
    Route::post('/verifications/upload', [StudentVerificationController::class, 'uploadSpreadsheet'])->name('admin.verifications.upload');
    Route::post('/verifications/toggle-role/{user}', [StudentVerificationController::class, 'toggleRole'])->name('admin.verifications.toggle-role');
    Route::post('/verifications/link/{record}', [StudentVerificationController::class, 'linkAccount'])->name('admin.verifications.link');
    Route::post('/verifications/unlink/{record}', [StudentVerificationController::class, 'unlinkAccount'])->name('admin.verifications.unlink');
});


/*
|--------------------------------------------------------------------------
| 5. SHARED PROFILE USER UTILITIES
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/dashboard', function () {
        /** @var User|null $user */
        $user = auth()->user();

        if ($user && $user->hasAnyRole(['admin', 'super_admin', 'warden', 'dean'])) {
            return redirect()->route('admin.dashboard');
        }

        return redirect()->route('student.dashboard');
    })->name('dashboard');
});

Route::middleware('auth')->group(function () {
    Route::get('/applications/{housingApplication}', [ApplicationController::class, 'show'])
        ->middleware('can:view,housingApplication');
});

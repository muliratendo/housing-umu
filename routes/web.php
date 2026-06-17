<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Models\HousingUnit;
use App\Models\Application as housingApplication;
use App\Http\Controllers\ApplicationController; // Fixes your ApplicationController error
use App\Http\Controllers\PublicHostelController; // Fixes your PublicHostelController error
use App\Http\Controllers\BookingController;      // Fixes your BookingController error
use App\Http\Controllers\ApprovalController;     // Fixes your ApprovalController error
use App\Http\Controllers\Admin\StudentVerificationController; // Fixes your StudentVerificationController error
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
    ]); // Points to Pages/Public/Welcome.tsx
})->name('welcome');

Route::get('/hostels', [PublicHostelController::class, 'index'])->name('public.hostels.index');


/*
|--------------------------------------------------------------------------
| 2. SHARED AUTHENTICATION PORTS
|--------------------------------------------------------------------------
*/
require __DIR__.'/auth.php';


/*
|--------------------------------------------------------------------------
| 3. STUDENT UI ROUTES (Requires Auth and Student Role)
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
        ]); // Pages/Student/Dashboard.tsx
    })->name('student.dashboard');

    Route::get('/bookings', [BookingController::class, 'index'])->name('student.bookings');
});


/*
|--------------------------------------------------------------------------
| 4. ADMIN CONTROL UI ROUTES (Requires Auth and System Admin Role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard'); // Pages/Admin/Dashboard.tsx
    })->name('admin.dashboard');

    Route::get('/verifications', [ApprovalController::class, 'index'])->name('admin.verifications');
});


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth'])->group(function () {
    // Laravel automatically passes the route model ID parameter through the ApplicationPolicy
    Route::get('/applications/{housingApplication}', [ApplicationController::class, 'show'])
        ->middleware('can:view,housingApplication');
});

Route::middleware(['auth'])->prefix('admin')->group(function () {
    // 🚀 FIXED: Point the POST action clean straight to the controller class method
    Route::post('/verifications/upload', [StudentVerificationController::class, 'uploadSpreadsheet'])
        ->name('admin.verifications.upload');
});

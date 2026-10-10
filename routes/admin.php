<?php
// routes/admin.php

use App\Http\Controllers\Admin\{
    AcademicTermController,
    AcademicYearController,
    AllocationController,
    ApplicationController,
    DashboardController,
    HostelController,
    MaintenanceController,
    OccupancyReportController,
    RoomController,
    StudentController,
    StudentVerificationController,
    UserManagementController,
};
use Illuminate\Support\Facades\Route;

Route::middleware([
        'auth',
        'verified',
        'role_or_permission:super_admin|dean|warden|affiliated_admin|admin|view admin dashboard',
    ])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

    // ─── Dashboard route ──────────────────────────────────────────────────
        // Admin dashboard home.
        Route::get('/dashboard', [DashboardController::class, 'index'])
            ->middleware('permission:view admin dashboard')
            ->name('dashboard');

    // ─── Applications routes ──────────────────────────────────────────────────
        // List all hostel applications.
        Route::get('/applications', [ApplicationController::class, 'index'])
            ->middleware('permission:view applications')
            ->name('applications.index');
        // Show a single application.
        Route::get('/applications/{application}', [ApplicationController::class, 'show'])
            ->middleware('permission:view applications')
            ->name('applications.show');
        // Approve an application.
        Route::patch('/applications/{application}/approve', [ApplicationController::class, 'approve'])
            ->middleware('permission:process applications')
            ->name('applications.approve');
        // Reject an application.
        Route::patch('/applications/{application}/reject', [ApplicationController::class, 'reject'])
            ->middleware('permission:process applications')
            ->name('applications.reject');
        // Available beds for allocation
        Route::get('applications/{application}/available-beds', [AllocationController::class, 'availableBedsForApplication'])
            ->middleware('permission:view allocations')
            ->name('allocations.available-beds');
        // Manual allocation dialog data + submit allocation action
        Route::post('applications/{application}/allocate', [AllocationController::class, 'manualAllocate'])
            ->middleware('permission:process applications')
            ->name('allocations.manual-allocate');

    // ─── Allocations routes ──────────────────────────────────────────────────
        // List allocations.
        Route::get('/allocations', [AllocationController::class, 'index'])
            ->middleware('permission:view allocations')
            ->name('allocations.index');
        // Show a single allocation.
        Route::get('/allocations/{allocation}', [AllocationController::class, 'show'])
            ->middleware('permission:view allocations')
            ->name('allocations.show');
        // Run allocation batch processing.
        Route::post('/allocations/run', [AllocationController::class, 'runBatch'])
            ->middleware('permission:process applications')
            ->name('allocations.run');
        // Manually override an allocation.
        Route::patch('/allocations/{allocation}/override', [AllocationController::class, 'override'])
            ->middleware('permission:switch allocations')
            ->name('allocations.override');
        // Check a student out of an allocation.
        Route::patch('/allocations/{allocation}/check-out', [AllocationController::class, 'checkOut'])
            ->middleware('permission:update allocations')
            ->name('allocations.check-out');
        // Fetch Available beds for manual allocation.
        Route::get('allocations/{allocation}/available-beds', [AllocationController::class, 'availableBedsForAllocation'])
            ->middleware('permission:switch allocations')
            ->name('allocations.available-beds-for-allocation');

    // ─── Waitlist routes ──────────────────────────────────────────────────
        // View the allocation waitlist.
        Route::get('/waitlist', [AllocationController::class, 'waitlist'])
            ->middleware('permission:view waitlists')
            ->name('waitlist.index');
        // Promote a waitlisted application.
        Route::patch('/waitlist/{application}/promote', [AllocationController::class, 'promote'])
            ->middleware('permission:manage waitlists')
            ->name('waitlist.promote');

    // ─── Hostel routes ──────────────────────────────────────────────────
        //
        // IMPORTANT: static paths such as /managed and /slug-availability must be
        // declared before parameterized paths such as /{hostel}/manage, /{hostel}/edit,
        // and /{hostel}/rooms. This prevents Laravel from attempting to resolve
        // "managed" or "slug-availability" as a Hostel route-model-binding value.

        // NEW: personal manager-scoped hostel landing page.
        //
        // super_admin and dean will be redirected by the controller to the full
        // catalogue. admin, warden, and affiliated_admin receive only their
        // hostel_managers pivot-assigned hostels.
        Route::get('/hostels/managed', [HostelController::class, 'managed'])
            ->middleware('permission:view hostels')
            ->name('hostels.managed');

        // NEW: lightweight JSON endpoint used by the hostel form to check whether a
        // slug remains available while the administrator is typing. Final validation
        // on store/update remains authoritative.
        Route::get('/hostels/slug-availability', [HostelController::class, 'slugAvailability'])
            ->middleware('permission:view hostels')
            ->name('hostels.slug-availability');

        // Full catalogue — controller query will still scope non-global users even
        // when they manually enter this URL.
        Route::get('/hostels', [HostelController::class, 'index'])
            ->middleware('permission:view hostels')
            ->name('hostels.index');

        // Create hostel — creation is enforced by HostelPolicy::create(), while this
        // broad middleware provides the first permission-level gate.
        Route::get('/hostels/create', [HostelController::class, 'create'])
            ->middleware('permission:create hostels')
            ->name('hostels.create');

        Route::post('/hostels', [HostelController::class, 'store'])
            ->middleware('permission:create hostels')
            ->name('hostels.store');

        // NEW: manager-facing hostel workspace. This is the account/profile-style
        // management page that replaces the rooms-only workflow. It can show hostel
        // identity/details plus rooms and an Edit Hostel Details action.
        Route::get('/hostels/{hostel}/manage', [HostelController::class, 'manage'])
            ->middleware('permission:update hostels')
            ->name('hostels.manage');

        // Existing edit page — object-level manager scoping is enforced by
        // $this->authorize('update', $hostel) in HostelController::edit().
        Route::get('/hostels/{hostel}/edit', [HostelController::class, 'edit'])
            ->middleware('permission:update hostels')
            ->name('hostels.edit');

        Route::patch('/hostels/{hostel}', [HostelController::class, 'update'])
            ->middleware('permission:update hostels')
            ->name('hostels.update');

        Route::patch('/hostels/{hostel}/toggle-applications', [HostelController::class, 'toggleApplications'])
            ->middleware('permission:update hostels')
            ->name('hostels.toggle-applications');

        // Manager assignment is intentionally stricter than ordinary hostel updates.
        // The route's permission middleware is broad; HostelPolicy::manageManagers()
        // makes the final server-side decision.
        Route::patch('/hostels/{hostel}/managers', [HostelController::class, 'syncManagers'])
            ->middleware('permission:update hostels')
            ->name('hostels.managers.sync');

        // Legacy rooms route. Keep this if existing redirects, bookmarks, or screens
        // still depend on it. You may later redirect it to hostels.manage.
        Route::get('/hostels/{hostel}/rooms', [HostelController::class, 'showRooms'])
            ->middleware('permission:update hostels')
            ->name('hostels.rooms');

        // ─── Room routes ─────────────────────────────────────────────────────
        Route::get('/rooms/{room}', [RoomController::class, 'show'])
            ->middleware('permission:view rooms')
            ->name('rooms.show');

        Route::patch('/rooms/{room}/toggle-capacity', [RoomController::class, 'toggleCapacity'])
            ->middleware('permission:update rooms')
            ->name('rooms.toggle-capacity');

        Route::get('/hostels/{hostel}/rooms/create', [RoomController::class, 'create'])
            ->middleware('permission:view rooms')
            ->name('rooms.create');

        Route::post('/hostels/{hostel}/rooms', [RoomController::class, 'store'])
            ->middleware('permission:view rooms')
            ->name('rooms.store');

        Route::get('/rooms/{room}/edit', [RoomController::class, 'edit'])
            ->middleware('permission:update rooms')
            ->name('rooms.edit');

        Route::patch('/rooms/{room}', [RoomController::class, 'update'])
            ->middleware('permission:update rooms')
            ->name('rooms.update');

        // ─── Bed routes ──────────────────────────────────────────────────────
        Route::get('/rooms/{room}/beds', [RoomController::class, 'beds'])
            ->middleware('permission:view beds')
            ->name('rooms.beds');

        Route::patch('/beds/{bed}/status', [RoomController::class, 'updateStatus'])
            ->middleware('permission:update beds')
            ->name('beds.update-status');

        Route::post('/rooms/{room}/beds', [RoomController::class, 'storeBed'])
            ->middleware('permission:update beds')
            ->name('rooms.beds.store');

        Route::delete('/beds/{bed}', [RoomController::class, 'destroyBed'])
            ->middleware('permission:update beds')
            ->name('beds.destroy');

    // ─── Maintenance routes ──────────────────────────────────────────────────
        // List maintenance requests.
        Route::get('/maintenance', [MaintenanceController::class, 'index'])
            ->middleware('permission:view maintenance')
            ->name('maintenance.index');
        // Show a single maintenance request.
        Route::get('/maintenance/{maintenanceRequest}', [MaintenanceController::class, 'show'])
            ->middleware('permission:view maintenance')
            ->name('maintenance.show');
        // Update maintenance request status.
        Route::patch('/maintenance/{maintenanceRequest}/update-status', [MaintenanceController::class, 'updateStatus'])
            ->middleware('permission:update maintenance')
            ->name('maintenance.update-status');

    // ─── Student Registry routes ──────────────────────────────────────────────────
        // List student registry records.
        Route::get('/students', [StudentController::class, 'index'])
            ->middleware('permission:view students')
            ->name('students.index');
        // Show a single student's details.
        Route::get('/students/{student}', [StudentController::class, 'show'])
            ->middleware('permission:view students')
            ->name('students.show');
        // Update editable student registry fields and delegated user profile fields.
        Route::patch('/students/{student}', [StudentController::class, 'update'])
            ->middleware('permission:view students')
            ->name('students.update');
        // Update roles for the linked student user account.
        Route::patch('/students/{student}/roles', [StudentController::class, 'updateRoles'])
            ->middleware('permission:manage roles and permissions')
            ->name('students.roles.update');
        // Update direct permissions for the linked student user account.
        Route::patch('/students/{student}/permissions', [StudentController::class, 'updatePermissions'])
            ->middleware('permission:manage roles and permissions')
            ->name('students.permissions.update');
        // Set a new password for the linked student user account.
        Route::patch('/students/{student}/password', [StudentController::class, 'updatePassword'])
            ->middleware('permission:manage roles and permissions')
            ->name('students.password.update');
        // Mark the linked student user email as verified.
        Route::post('/students/{student}/verify-email', [StudentController::class, 'markEmailVerified'])
            ->middleware('permission:manage roles and permissions')
            ->name('students.email.verify');
        // Resend a verification email to the linked student user.
        Route::post('/students/{student}/send-verification', [StudentController::class, 'sendVerificationEmail'])
            ->middleware('permission:view students')
            ->name('students.email.send');
        // Send a password reset link to the linked student user.
        Route::post('/students/{student}/password-reset', [StudentController::class, 'sendPasswordReset'])
            ->middleware('permission:manage roles and permissions')
            ->name('students.password.reset');

    // ─── Academic Terms routes ──────────────────────────────────────────────────
        // List academic terms.
        Route::get('/academic-terms', [AcademicTermController::class, 'index'])
            ->middleware('permission:manage semesters')
            ->name('academic-terms.index');
        // Create a new academic term.
        Route::post('/academic-terms', [AcademicTermController::class, 'store'])
            ->middleware('permission:manage semesters')
            ->name('academic-terms.store');
        // Update an existing academic term.
        Route::patch('/academic-terms/{term}', [AcademicTermController::class, 'update'])
            ->middleware('permission:manage semesters')
            ->name('academic-terms.update');
        // Activate an academic term (marks all others inactive).
        Route::patch('/academic-terms/{term}/activate', [AcademicTermController::class, 'activate'])
            ->middleware('permission:manage semesters')
            ->name('academic-terms.activate');
        // De-activate an academic term.
        Route::patch('/admin/academic-terms/{term}/deactivate', [AcademicTermController::class, 'deactivate'])
            ->name('academic-terms.deactivate');

    // ─── Academic Years routes ──────────────────────────────────────────────────
        // Create a new academic year (used inline from the New Term dialog's
        // "Manage Academic Years" popover — see AcademicYearManager.tsx).
        Route::post('/academic-years', [AcademicYearController::class, 'store'])
            ->middleware('permission:manage semesters')
            ->name('academic-years.store');
        // NEW: rename/adjust an existing academic year's start/end years.
        Route::patch('/academic-years/{academicYear}', [AcademicYearController::class, 'update'])
            ->middleware('permission:manage semesters')
            ->name('academic-years.update');
        // NEW: delete an academic year, blocked server-side if it still has terms.
        Route::delete('/academic-years/{academicYear}', [AcademicYearController::class, 'destroy'])
            ->middleware('permission:manage semesters')
            ->name('academic-years.destroy');

    // ─── Occupancy Report routes ──────────────────────────────────────────────────
        // View occupancy report page.
        Route::get('/reports/occupancy', [OccupancyReportController::class, 'index'])
            ->middleware('permission:view reports')
            ->name('reports.occupancy');
        // Export occupancy reports.
        Route::get('/reports/export', [OccupancyReportController::class, 'export'])
            ->middleware('permission:view reports')
            ->name('reports.export');

    // ─── User Management routes ──────────────────────────────────────────────────
        // List users for admin user management.
        Route::get('/users', [UserManagementController::class, 'index'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.index');
        // Update a user's profile details such as name and email.
        Route::patch('/users/{user}/profile', [UserManagementController::class, 'updateProfile'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.profile.update');
        // Update a user's password.
        Route::patch('/users/{user}/password', [UserManagementController::class, 'updatePassword'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.password.update');
        // Send a password reset link to a user.
        Route::post('/users/{user}/password-reset', [UserManagementController::class, 'sendPasswordReset'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.password.reset');
        // Mark a user's email address as verified.
        Route::post('/users/{user}/verify-email', [UserManagementController::class, 'markEmailVerified'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.verify-email');
        // Send or resend a verification email to a user.
        Route::post('/users/{user}/send-verification', [UserManagementController::class, 'sendVerificationEmail'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.send-verification');
        // Update user roles.
        Route::patch('/users/{user}/roles', [UserManagementController::class, 'updateRoles'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.roles.update');
        // Update user direct permissions.
        Route::patch('/users/{user}/permissions', [UserManagementController::class, 'updatePermissions'])
            ->middleware('permission:manage roles and permissions')
            ->name('users.permissions.update');
        // Create a new role from admin user management.
        Route::post('/roles', [UserManagementController::class, 'storeRole'])
            ->middleware('permission:manage roles and permissions')
            ->name('roles.store');
        // Create a new permission from admin user management.
        Route::post('/permissions', [UserManagementController::class, 'storePermission'])
            ->middleware('permission:manage roles and permissions')
            ->name('permissions.store');

    // ─── Student Verification routes ──────────────────────────────────────────────────
        // View the student verification dashboard.
        Route::get('/student-registry/verification', [StudentVerificationController::class, 'index'])
            ->middleware('permission:view students')
            ->name('student-registry.verification');
        // Link an existing user account to a verified student record.
        Route::post('/student-registry/verification/{record}/link', [StudentVerificationController::class, 'link'])
            ->middleware('permission:manage roles and permissions')
            ->name('student-registry.verification.link');
        // Unlink a verified student record from its current user account.
        Route::post('/student-registry/verification/{record}/unlink', [StudentVerificationController::class, 'unlink'])
            ->middleware('permission:manage roles and permissions')
            ->name('student-registry.verification.unlink');
        // Create a new user account from a verified student record and link it.
        Route::post('/student-registry/verification/{record}/create-user', [StudentVerificationController::class, 'createUser'])
            ->middleware('permission:manage roles and permissions')
            ->name('student-registry.verification.create-user');
        // Mark or resend email verification for a user linked to a verified student record.
        Route::post('/student-registry/verification/{record}/verify-email', [StudentVerificationController::class, 'verifyEmail'])
            ->middleware('permission:manage roles and permissions')
            ->name('student-registry.verification.verify-email');
    });

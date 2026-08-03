<?php
// File: app/Http/Controllers/Admin/DashboardController.php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Services\Admin\AdminDashboardService;
use Illuminate\Http\Request;
use Inertia\{Inertia, Response};

class DashboardController extends Controller
{
    public function __construct(private readonly AdminDashboardService $dashboardService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $term = AcademicTerm::current();

        return Inertia::render('Admin/Dashboard', [
            'currentTerm' => $term ? [
                'id'            => $term->id,
                'name'          => $term->name,
                'academic_year' => $term->academicYear?->label,
                'window_open'   => $term->application_window_open?->toDateString(),
                'window_close'  => $term->application_window_close?->toDateString(),
            ] : null,

            'metrics' => $this->dashboardService->metricsFor($user, $term),

            'entryPoints' => array_values(array_filter([
                ['label' => 'Pending Applications',   'route' => 'admin.applications.index',    'permission' => 'view applications'],
                ['label' => 'Waitlist',                'route' => 'admin.waitlist.index',        'permission' => 'view waitlists'],
                ['label' => 'Open Maintenance Issues', 'route' => 'admin.maintenance.index',     'permission' => 'view maintenance'],
                ['label' => 'Manage Academic Terms',   'route' => 'admin.academic-terms.index',  'permission' => 'manage semesters'],
                ['label' => 'Manage Hostels',          'route' => 'admin.hostels.index',         'permission' => 'view hostels'],
                ['label' => 'Manage Users',            'route' => 'admin.users.index',           'permission' => 'manage roles and permissions'],
            ], fn ($entry) => $user->can($entry['permission']))),
        ]);
    }
}

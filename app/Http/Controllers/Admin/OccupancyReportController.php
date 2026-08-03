<?php
// app/Http/Controllers/Admin/OccupancyReportController.php
declare(strict_types=1);
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{AcademicTerm, Hostel};
use App\Services\OccupancyReportService;
use Illuminate\Http\{Request, StreamedResponse};
use Inertia\{Inertia, Response};

class OccupancyReportController extends Controller
{
    public function __construct(private readonly OccupancyReportService $reportService) {}

    /** A12 — Occupancy Report | GET /admin/reports/occupancy */
    public function index(Request $request): Response
    {
        $this->authorize('viewReports', Hostel::class);
        $termId = $request->integer('term_id') ?: AcademicTerm::current()?->id;
        return Inertia::render('Admin/Reports/Occupancy', [
            'report'       => $this->reportService->buildReport($termId),
            'terms'        => AcademicTerm::orderBy('created_at','desc')->get(['id','name']),
            'selectedTerm' => $termId,
        ]);
    }

    /** ASYS-8 — Export | GET /admin/reports/export */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewReports', Hostel::class);
        $termId   = $request->integer('term_id') ?: AcademicTerm::current()?->id;
        $term     = AcademicTerm::find($termId);
        $data     = $this->reportService->buildReport($termId);
        $filename = 'occupancy_' . ($term?->name ?? 'all') . '_' . now()->format('Ymd') . '.csv';
        return response()->streamDownload(function() use ($data) {
            $out = fopen('php://output','w');
            fputcsv($out,['Hostel','Management','Total Beds','Occupied','Vacant','Waitlisted','Occupancy %']);
            foreach ($data['hostels'] as $row) {
                fputcsv($out,[$row['name'],$row['management_type'],$row['total_beds'],$row['occupied'],$row['vacant'],$row['waitlisted'],$row['occupancy_pct']]);
            }
            fclose($out);
        }, $filename, ['Content-Type'=>'text/csv']);
    }
}

<?php
// app/Services/OccupancyReportService.php
declare(strict_types=1);
namespace App\Services;

use App\Models\{AcademicTerm, Hostel};
use Illuminate\Support\Facades\DB;

class OccupancyReportService
{
    public function buildReport(?int $termId): array
    {
        $hostels = Hostel::with('rooms.beds')->get();
        $waitlisted = [];
        if ($termId) {
            $waitlisted = DB::table('allocations')
                ->where('academic_term_id',$termId)->where('status','waitlisted')
                ->select('hostel_id', DB::raw('count(*) as cnt'))->groupBy('hostel_id')
                ->pluck('cnt','hostel_id')->toArray();
        }
        $rows = $hostels->map(function(Hostel $h) use ($waitlisted) {
            $total  = $h->rooms->sum(fn($r) => $r->beds->count());
            $occ    = $h->rooms->sum(fn($r) => $r->beds->where('status','occupied')->count());
            $vac    = $h->rooms->sum(fn($r) => $r->beds->where('status','available')->count());
            $maint  = $h->rooms->sum(fn($r) => $r->beds->where('status','maintenance')->count());
            $wait   = $waitlisted[$h->id] ?? 0;
            return [
                'id'=>$h->id,'name'=>$h->name,'management_type'=>$h->management_type,
                'campus_location'=>$h->campus_location,'gender_scope'=>$h->gender_scope,
                'total_beds'=>$total,'occupied'=>$occ,'vacant'=>$vac,'maintenance'=>$maint,'waitlisted'=>$wait,
                'occupancy_pct'=>$total > 0 ? round(($occ/$total)*100,1) : 0,
            ];
        });
        $totals = [
            'total_beds'=>$rows->sum('total_beds'),'occupied'=>$rows->sum('occupied'),
            'vacant'=>$rows->sum('vacant'),'maintenance'=>$rows->sum('maintenance'),
            'waitlisted'=>$rows->sum('waitlisted'),'occupancy_pct'=>0,
        ];
        if ($totals['total_beds'] > 0)
            $totals['occupancy_pct'] = round(($totals['occupied']/$totals['total_beds'])*100,1);
        return ['hostels'=>$rows->values()->toArray(),'totals'=>$totals];
    }

    /** Lightweight snapshot for public landing page */
    public function landingSnapshot(): array
    {
        $r = $this->buildReport(AcademicTerm::current()?->id);
        return ['total_beds'=>$r['totals']['total_beds'],'occupied'=>$r['totals']['occupied'],'vacant'=>$r['totals']['vacant'],'occupancy_pct'=>$r['totals']['occupancy_pct']];
    }
}

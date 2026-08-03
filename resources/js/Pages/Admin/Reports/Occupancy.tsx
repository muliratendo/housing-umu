// resources/js/Pages/Admin/Reports/Occupancy.tsx
import React from 'react';
import { route } from 'ziggy-js';
import { Head, router } from '@inertiajs/react';
import { BarChart3, Download } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OccupancyBar from '@/components/Admin/shared/OccupancyBar';

export default function OccupancyReport({ report, terms, selectedTerm }: any) {
  const changeTerm = (v:string) => router.get(route('admin.reports.occupancy'),{term_id:v},{preserveState:true});
  const exportCsv  = () => window.location.href = route('admin.reports.export') + (selectedTerm?`?term_id=${selectedTerm}`:'');
  const { totals, hostels } = report;
  return (
    <AuthenticatedLayout title="Occupancy Report" breadcrumbs={[{label:'Dashboard',href:route('admin.dashboard')},{label:'Occupancy Report'}]}>
      <Head title="Occupancy Report — Admin"/>
      <div className="space-y-5 px-4 py-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="size-5 text-[#f1b418]"/>Occupancy Report</h1>
          <div className="flex items-center gap-2">
            <Select value={String(selectedTerm??'')} onValueChange={changeTerm}>
              <SelectTrigger className="h-8 text-xs w-52"><SelectValue placeholder="Select term"/></SelectTrigger>
              <SelectContent>{terms.map((t:any)=><SelectItem key={t.id} value={String(t.id)} className="text-xs">{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={exportCsv}>
              <Download className="size-3.5"/> Export CSV
            </Button>
          </div>
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{label:'Total Beds',val:totals.total_beds},{label:'Occupied',val:totals.occupied},{label:'Vacant',val:totals.vacant},{label:'Occupancy',val:`${totals.occupancy_pct}%`}].map(c=>(
            <div key={c.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{c.val}</p>
            </div>
          ))}
        </div>
        {/* Per-hostel table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{['Hostel','Type','Total','Occupied','Vacant','Waitlisted','Occupancy'].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {hostels.map((h:any)=>(
                <tr key={h.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{h.name}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] capitalize">{h.management_type}</Badge></td>
                  <td className="px-4 py-2.5 tabular-nums">{h.total_beds}</td>
                  <td className="px-4 py-2.5 tabular-nums">{h.occupied}</td>
                  <td className="px-4 py-2.5 tabular-nums">{h.vacant}</td>
                  <td className="px-4 py-2.5 tabular-nums">{h.waitlisted}</td>
                  <td className="px-4 py-2.5"><OccupancyBar occupied={h.occupied} total={h.total_beds} showText/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

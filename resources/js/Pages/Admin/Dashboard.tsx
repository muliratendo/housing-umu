import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UmuHousingCard, { HousingUnitProps } from '@/components/UmuHousingCard';
import { Head } from '@inertiajs/react';
import React from 'react';

interface DashboardProps {
  units: HousingUnitProps[];
}

export default function Dashboard({ units }: DashboardProps) {
  return (
    <AuthenticatedLayout header="Nkozi Accommodations">
      <Head title="Hostel Dashboard" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
          Recommended Student Hostels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore verified accommodation spaces within walking distance of the
          UMU Main Gate.
        </p>
      </div>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No accommodations found near campus at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => (
            <UmuHousingCard key={unit.id} unit={unit} />
          ))}
        </div>
      )}
    </AuthenticatedLayout>
  );
}

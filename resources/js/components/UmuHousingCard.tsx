import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, ShieldCheck, DollarSign } from 'lucide-react';

// 1. Structure the typescript bindings matching your backend database streams
export interface HousingUnitProps {
  id: number;
  title: string;
  location: string;          // e.g., "Nkozi Main Gate", "Kayabwe Road"
  price: number;             // Price per semester / month
  beds: number;              // Number of beds or room type
  is_verified: boolean;      // Approved UMU standard housing badge
  image_url?: string;        // Optional hostel exterior photo link
  description?: string;      // Snippet overview
}

interface UmuHousingCardProps {
  unit: HousingUnitProps;
}

export default function UmuHousingCard({ unit }: UmuHousingCardProps) {
  // Format Ugandan Shilling price display cleanly
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md border border-muted">

      {/* Visual Header Image Container */}
      <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
        {unit.image_url ? (
          <img
            src={unit.image_url}
            alt={unit.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="text-muted-foreground text-xs font-medium">No Hostel Image Provided</div>
        )}

        {/* Dynamic Verification Badges overlaid top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {unit.is_verified && (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1 shadow-sm text-xs">
              <ShieldCheck className="h-3 w-3" /> UMU Approved
            </Badge>
          )}
        </div>
      </div>

      {/* Primary Context Data Block */}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-bold tracking-tight text-foreground line-clamp-1">
            {unit.title}
          </CardTitle>
        </div>

        {/* Campus Location Mapping Metadata Line */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{unit.location}</span>
        </div>
      </CardHeader>

      {/* Detailed Amenities Metrics */}
      <CardContent className="p-4 pt-0 pb-3 text-sm flex-1">
        {unit.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {unit.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span>{unit.beds} {unit.beds === 1 ? 'Bed Space' : 'Bed Spaces'}</span>
          </div>
        </div>
      </CardContent>

      {/* Pricing Information and Booking Actions Footer Row */}
      <CardFooter className="p-4 pt-0 border-t bg-muted/20 flex items-center justify-between mt-auto">
        <div className="flex flex-col pt-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Semester Rent</span>
          <span className="text-base font-bold text-foreground tracking-tight">
            {formatCurrency(unit.price)}
          </span>
        </div>

        <Button size="sm" className="mt-3 bg-brand-600 hover:bg-brand-700 font-medium">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

// File: resources/js/components/Student/KpiCard.jsx
import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: ReactNode;
  value: ReactNode;
  icon: React.ElementType;
  subtitle?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  className = '',
  action = null,
}: KpiCardProps) {
  return (
    <Card className={cn('rounded-xl border shadow-sm hover:shadow-md transition-shadow, p-0', className)}>
      <CardContent className="p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium truncate">{title}</span>
          {Icon && (
            <div className="flex-shrink-0 rounded-lg p-2 bg-[#f1b418]/10">
              <Icon className="size-5 text-[#f1b418]" strokeWidth={1.8} />
            </div>
          )}
        </div>
        <div className="text-2xl font-bold font-heading text-foreground leading-tight">
          {value ?? '—'}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {action && <div className="mt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}

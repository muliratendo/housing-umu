import { Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

// Define the interface for your props
interface GuestLayoutProps {
  children: ReactNode;
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/">
              <img
                src="/favicon_io/android-chrome-512x512.png"
                alt="UMU Housing Portal Logo"
                className="h-16 w-16 object-contain mx-auto transition-transform duration-200 hover:scale-105"
              />
              <h1 className="text-2xl font-bold tracking-tight mt-2">
                UMU Housing Portal
              </h1>
            </Link>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="grid p-0">
              <div className="p-6 md:p-8">{children}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

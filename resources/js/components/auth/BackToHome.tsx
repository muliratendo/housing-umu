// resources/js/components/auth/BackToHome.tsx — NEW FILE

import { Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ArrowLeft } from 'lucide-react';

export function BackToHome() {
  return (
    <div className="mt-6 text-center">
      <Link
        href={route('welcome')}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground
                   hover:text-foreground transition-colors font-medium"
        title="Return to the Housing@UMU homepage"
      >
        <ArrowLeft className="size-3.5" />
        Back to Home
      </Link>
    </div>
  );
}

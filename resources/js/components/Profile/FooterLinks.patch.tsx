// File: resources/js/Layouts/AuthenticatedLayout.tsx
//
// FIND the existing footer link block:
//
//   <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
//   <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
//   <Link href="#" className="hover:text-foreground transition-colors">Support Helpline</Link>
//
// REPLACE with:

import { route } from 'ziggy-js';

// (already imported in AuthenticatedLayout — no extra import needed)

<Link href={route('policy.privacy')} className="hover:text-foreground transition-colors">
  Privacy Policy
</Link>
<Link href={route('policy.terms')} className="hover:text-foreground transition-colors">
  Terms of Service
</Link>
<Link href={route('policy.cookie')} className="hover:text-foreground transition-colors">
  Cookie Policy
</Link>
<Link href={route('public.support')} className="hover:text-foreground transition-colors">
  Support Helpline
</Link>

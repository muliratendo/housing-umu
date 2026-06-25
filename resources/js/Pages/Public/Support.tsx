import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  ArrowUp,
  ChevronRight,
} from 'lucide-react';

type FaqItem = {
  question: string;
  answer: string;
  actionLabel?: string;
  actionHref?: string;
};

const faqs: FaqItem[] = [
  {
    question: 'How do I find and apply for the right hostel?',
    answer:
      'Use the housing engine to browse campus-managed and affiliated hostels, filter by price, location, and policy, then open a room card and click “Apply for this room” to submit your application.',
    actionLabel: 'Browse hostels',
    actionHref: '/hostels',
  },
  {
    question: 'How are gender-aware and safety policies enforced?',
    answer:
      'Gender-aware policies are built into the allocation engine. The system routes applications to appropriate blocks or floors based on university guidelines, and some buildings are restricted to specific gender scopes.',
    actionLabel: 'Browse hostels',
    actionHref: '/hostels',
  },
  {
    question: 'Can I change my room after I have been allocated?',
    answer:
      'Yes, you can submit a room change request through the portal. Requests are reviewed by the Dean or Warden support staff and processed subject to availability and campus policy.',
    actionLabel: 'Browse hostels',
    actionHref: '/hostels',
  },
  {
    question: 'Can I select or link a roommate in my application?',
    answer:
      'In eligible shared rooms, you can optionally invite a roommate and link bookings. Co-linked registrations may require approval flags from the Housing Office before they are confirmed.',
    actionLabel: 'Browse hostels',
    actionHref: '/hostels',
  },
  {
    question: 'How do I report maintenance issues or emergencies in my room?',
    answer:
      'You can log maintenance issues directly from the housing portal, and urgent safety concerns should be reported through the emergency contacts listed on the Contact & Support page for faster routing.',
    actionLabel: 'Browse hostels',
    actionHref: '/hostels',
  },
];

export default function Support(): React.JSX.Element {
  // State to track vertical pixel displacement
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Bind scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Clean up memory leaks on component unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth navigation viewport click helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollDownALittle = () => {
    window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title="Support | Housing@UMU" />

      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/20">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Page heading */}
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              Support & Help
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Contact Housing@UMU
            </h1>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Get Support with questions about hostel applications,
              allocations, payments, or general accommodation support.
            </p>
          </header>

          {/* Top grid: general contact + campus location */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* General contact details */}
            <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="uppercase tracking-tight">
                    General contacts
                  </Badge>
                </div>

                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-accent-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        Email
                      </p>
                      <p>housing@umu.ac.ug</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-accent-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        Phone
                      </p>
                      <p>+256 123 456 789</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Monday – Friday, 8:30am – 5:00pm (EAT)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 text-accent-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        WhatsApp support:
                      </p>
                      <p>+256 987 654 321 (text only).</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency contact details */}
            <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="space-y-3 p-5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-brand-red/80 text-brand-red font-bold text-md text-brand-black uppercase tracking-tight">
                    Emmergency Contacts
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p>
                    <span className="font-semibold">
                      Secretary Campus Affairs:
                    </span>{' '}
                    +256 123 456 789
                  </p>
                  <p>
                    <span className="font-semibold">
                      Campus Security Manager:
                    </span>{' '}
                    +256 123 456 789
                  </p>
                  <p>
                    <span className="font-semibold">
                      Campus Security Manager:
                    </span>{' '}
                    +256 123 456 789
                  </p>
                  <p>
                    <span className="font-semibold">
                      Campus Security Manager:
                    </span>{' '}
                    +256 123 456 789
                  </p>
                  <p>
                    <span className="font-semibold">
                      Campus Security Manager:
                    </span>{' '}
                    +256 123 456 789
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact form + extra support details */}
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Contact form */}
            <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent-500" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    Send us a message
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Use this form for general questions about hostels, room
                  allocations, or support. We aim to respond within 1–2
                  working days.
                </p>

                <form
                  method="post"
                  action="/contact/support"
                  className="space-y-3 text-sm"
                >
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Full name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Email address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Topic
                    </label>
                    <select
                      name="topic"
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="applications">Applications & Room choices</option>
                      <option value="allocations">Room allocations</option>
                      <option value="technical">Technical issues with the portal</option>
                      <option value="other">Other question</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Message
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-12 rounded-full bg-accent-500 px-12 text-xs font-medium text-brand-black transition-transform duration-300 hover:scale-105 transition-all duration-200 hover:px-13 hover:bg-accent-600"
                  >
                    Submit message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Extra support details + FAQ */}
            <div className="space-y-4">
              {/* Location of the main campus */}
              <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="uppercase tracking-tight">
                      Main campus location
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-accent-500" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          Uganda Martyrs University – Main Campus
                        </p>
                        <p>Nkozi, Mpigi District, Uganda</p>
                      </div>
                    </div>

                    {/* Optional: link to a map or directions */}
                    <Link
                      href="https://maps.google.com"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-accent-500"
                    >
                      Open in Maps
                      <ArrowRight className="h-3 w-3 text-accent-500" />
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-accent-500" />
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      Frequently asked questions
                    </h2>
                  </div>

                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    {faqs.map((faq) => (
                      <details
                        name="contact-support-faq"
                        key={faq.question}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <summary className="cursor-pointer text-xs font-semibold text-slate-900 dark:text-slate-50">
                          {faq.question}
                        </summary>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          {faq.answer}
                        </p>

                        {faq.actionHref && faq.actionLabel && (
                          <Link
                            href={faq.actionHref}
                            className="pt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-accent-500"
                          >
                            <span>{faq.actionLabel}</span>
                            <ChevronRight className="h-3 w-3 text-accent-500" />
                          </Link>
                        )}
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
            A. CENTERED SCROLL DOWN OVERLAY INDICATOR
          ========================================================================= */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 pointer-events-none flex flex-col items-center gap-1.5 ${scrollY > 20 ? 'opacity-0 translate-y-4' : 'opacity-100'
          }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-background/80 backdrop-blur px-2.5 py-1 rounded-full border shadow-sm">
          Scroll To Explore
        </span>
        {/* Bouncing animation indicator hook */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full bg-background/90 shadow-md border pointer-events-auto animate-bounce cursor-pointer hover:bg-background"
          onClick={scrollDownALittle}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* =========================================================================
            B. NON-INVASIVE BACK TO TOP BUTTON OVERLAY
          ========================================================================= */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg border border-primary flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-300 ${scrollY > 400
            ? 'opacity-100 translate-y-0 cursor-pointer'
            : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        aria-label="Back to top"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </GuestLayout>
  );
}

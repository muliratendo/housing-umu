import { FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';

interface VerifyEmailProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            {/* Informational Text */}
            <div className="mb-4 text-sm text-muted-foreground leading-relaxed">
                Thanks for signing up! Before getting started, could you verify
                your email address by clicking on the link we just emailed to
                you? If you didn't receive the email, we will gladly send you
                another.
            </div>

            {/* Dynamic Status Alert Message */}
            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-md">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* shadcn Button replaces PrimaryButton */}
                    <Button type="submit" className="w-full sm:w-auto font-medium" disabled={processing}>
                        {processing ? 'Sending...' : 'Resend Verification Email'}
                    </Button>

                    {/* Clean styled logout link */}
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-muted-foreground underline hover:text-foreground transition-colors font-medium"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}

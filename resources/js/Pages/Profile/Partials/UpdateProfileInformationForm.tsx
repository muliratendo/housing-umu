import { FormEventHandler } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
}

interface CustomPageProps {
    auth: {
        user: User;
    };
    [key: string]: any;
}

interface UpdateProfileInformationProps {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: UpdateProfileInformationProps) {
    const user = usePage<CustomPageProps>().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Profile Information
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-4">
                {/* Name Input Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                        required
                        autoFocus
                        autoComplete="name"
                    />
                    {errors.name && <p className="text-xs font-semibold text-destructive">{errors.name}</p>}
                </div>

                {/* Email Input Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                        required
                        autoComplete="username"
                    />
                    {errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
                </div>

                {/* Email Verification Banner */}
                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2 mt-2">
                        <p className="text-sm text-foreground font-medium">
                            Your email address is unverified.
                        </p>
                        <Link
                            href={route('verification.send')}
                            method="post"
                            as="button"
                            className="text-xs font-semibold text-primary underline hover:text-primary/80 block text-left transition-colors"
                        >
                            Click here to re-send the verification email.
                        </Link>

                        {status === 'verification-link-sent' && (
                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                A new verification link has been sent to your email address.
                            </div>
                        )}
                    </div>
                )}

                {/* Save Trigger Actions Block */}
                <div className="flex items-center gap-4 pt-2">
                    <Button type="submit" className="font-medium px-6" disabled={processing}>
                        {processing ? 'Saving...' : 'Save Changes'}
                    </Button>

                    {/* Native CSS Success Banner */}
                    {recentlySuccessful && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-all animate-out fade-out duration-1000 fill-mode-forwards">
                            Changes saved.
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}

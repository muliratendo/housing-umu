import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <form onSubmit={submit} className="space-y-4">
                {/* Hidden Token Input */}
                <input type="hidden" name="token" value={data.token} />

                {/* Email Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    {errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    {errors.password && <p className="text-xs font-semibold text-destructive">{errors.password}</p>}
                </div>

                {/* Password Confirmation Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className={errors.password_confirmation ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    {errors.password_confirmation && (
                        <p className="text-xs font-semibold text-destructive">{errors.password_confirmation}</p>
                    )}
                </div>

                {/* Submit Button Block */}
                <div className="pt-2 flex justify-end">
                    <Button type="submit" className="w-full font-medium" disabled={processing}>
                        {processing ? 'Updating Password...' : 'Reset Password'}
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}

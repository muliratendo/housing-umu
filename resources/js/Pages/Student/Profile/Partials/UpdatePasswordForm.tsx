import { useRef, FormEventHandler } from 'react';
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UpdatePasswordFormProps {
    className?: string;
}

export default function UpdatePasswordForm({ className = '' }: UpdatePasswordFormProps) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Update Password
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Ensure your account is using a long, random password to stay secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-4">
                {/* Current Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                        id="current_password"
                        type="password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        className={errors.current_password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="current-password"
                    />
                    {errors.current_password && (
                        <p className="text-xs font-semibold text-destructive">{errors.current_password}</p>
                    )}
                </div>

                {/* New Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                    />
                    {errors.password && (
                        <p className="text-xs font-semibold text-destructive">{errors.password}</p>
                    )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        className={errors.password_confirmation ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                    />
                    {errors.password_confirmation && (
                        <p className="text-xs font-semibold text-destructive">{errors.password_confirmation}</p>
                    )}
                </div>

                {/* Save Trigger Row Actions */}
                <div className="flex items-center gap-4 pt-2">
                    <Button type="submit" className="font-medium px-6" disabled={processing}>
                        {processing ? 'Saving...' : 'Save Password'}
                    </Button>

                    {/* Native CSS-Animated Success Label */}
                    {recentlySuccessful && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-all animate-out fade-out duration-1000 fill-mode-forwards">
                            Saved successfully.
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}

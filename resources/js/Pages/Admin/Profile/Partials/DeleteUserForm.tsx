import { useRef, useState, FormEventHandler } from 'react';
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface DeleteUserFormProps {
    className?: string;
}

export default function DeleteUserForm({ className = '' }: DeleteUserFormProps) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Delete Account
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to
                    retain.
                </p>
            </header>

            {/* shadcn Destructive Action Button */}
            <Button variant="destructive" onClick={() => setConfirmingUserDeletion(true)}>
                Delete Account
            </Button>

            {/* shadcn Dialog Engine Layout (Controlled Overlay state) */}
            <Dialog open={confirmingUserDeletion} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={deleteUser} className="space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                Are you sure you want to delete your account?
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground pt-1">
                                Once your account is deleted, all of its resources and data will be permanently deleted.
                                Please enter your password to confirm account removal.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Password confirmation stack */}
                        <div className="space-y-2">
                            <Label htmlFor="delete-password" className="sr-only">
                                Password
                            </Label>
                            <Input
                                id="delete-password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={errors.password ? 'border-destructive focus-visible:ring-destructive' : 'w-full'}
                                placeholder="Enter password to confirm"
                                required
                                autoFocus
                            />
                            {errors.password && (
                                <p className="text-xs font-semibold text-destructive">{errors.password}</p>
                            )}
                        </div>

                        {/* Modal Dialog Actions Footer Container */}
                        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" className="w-full sm:w-auto" disabled={processing}>
                                {processing ? 'Deleting...' : 'Permanently Delete Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}

<?php

// File: app/Http/Middleware/RedirectAuthenticatedFromAuthPages.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * PURPOSE:
 * Prevent already-authenticated users from reopening guest-only auth pages:
 * login, registration, password-reset request, and password reset.
 *
 * IMPORTANT:
 * This is a SERVER-SIDE guard. Do not rely on React redirects for this
 * requirement because the server must decide whether the page is allowed.
 */
class RedirectAuthenticatedFromAuthPages
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // A real guest may continue to Login, Register, Forgot Password, etc.
        if (! $user) {
            return $next($request);
        }

        /*
         * An authenticated but unverified user must be allowed to reach
         * verification.notice. They cannot use their normal dashboard yet
         * because the student/admin portal already requires `verified`.
         */
        if (method_exists($user, 'hasVerifiedEmail') && ! $user->hasVerifiedEmail()) {
            return redirect()
                ->route('verification.notice')
                ->with('authNotice', [
                    'type' => 'warning',
                    'title' => 'Verify your email to continue',
                    'message' => 'You are already signed in. Please verify your email address before opening your dashboard.',
                    'showLogoutAction' => true,
                ]);
        }

        /*
         * A verified user has no reason to revisit guest-only auth pages.
         * Redirect by role, rather than assuming every user is a student.
         */
        return redirect()
            ->to($this->dashboardUrlFor($user))
            ->with('authNotice', [
                'type' => 'info',
                'title' => 'You are already signed in',
                'message' => 'You are already signed in as '.$user->email.'. If this is not your account, you can sign out below.',
                'showLogoutAction' => true,
            ]);
    }

    /**
     * Maps each authenticated role to its proper dashboard.
     *
     * Developer note:
     * Keep all role names in one place. This prevents login/register routes
     * from accidentally sending an admin into the student portal.
     */
    private function dashboardUrlFor(object $user): string
    {
        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole([
            'admin',
            'super_admin',
            'warden',
            'dean',
            'affiliated_admin',
        ])) {
            return route('admin.dashboard');
        }

        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole([
            'student',
            'student_leader',
        ])) {
            return route('student.dashboard');
        }

        /*
         * Safe fallback for a user with an unexpected or missing role.
         * Your existing /dashboard route should display a controlled 403
         * or redirect according to your application policy.
         */
        return route('dashboard');
    }
}

<?php
// app/Http/Controllers/Auth/AuthenticatedSessionController.php
// REPLACE existing file entirely.

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     *
     * Guards against re-rendering the login page for an already-authenticated
     * session — which would cause subsequent POST attempts to fail with
     * "credentials do not match" because the session guard refuses to
     * re-authenticate an active session.
     */
    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            return $this->redirectByRole($user);
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status'           => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        /** @var User $user */
        $user = $request->user();

        return $this->redirectByRole($user);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * Centralised role-based redirect.
     * Uses redirect()->intended() on login so deep-link redirects are honoured.
     * Falls back to redirect() on the already-authenticated path (no intended URL).
     */
    private function redirectByRole(User $user): RedirectResponse
    {
        if ($user->hasAnyRole(['admin', 'super_admin', 'warden', 'dean', 'affiliated_hostel_admin'])) {
            return redirect()->intended(route('admin.dashboard'));
        }

        if ($user->hasRole('student')) {
            return redirect()->intended(route('student.dashboard'));
        }

        return redirect()->intended(route('welcome'));
    }
}

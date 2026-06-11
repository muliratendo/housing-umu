<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Stats\UserStats;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
  /**
   * Display the registration view.
   */
  public function create(): Response
  {
    return Inertia::render('Auth/Register');
  }

  /**
   * Handle an incoming registration request.
   *
   * @throws \Illuminate\Validation\ValidationException
   */
  public function store(Request $request): RedirectResponse
  {
    $request->validate([
      'firstname' => 'required|string|max:255',
      'lastname' => 'required|string|max:255',
      'email' => [
        'required',
        'string',
        'lowercase',
        'safe_email',              // custom rule
        'max:255',
        Rule::unique(User::class), // safer unique syntax
      ],
      'password' => ['required', 'confirmed', Rules\Password::defaults()],
    ]);

    $user = User::create([
      'firstname' => $request->firstname,
      'lastname' => $request->lastname,
      'email' => $request->email,
      'password' => Hash::make($request->password),
    ]);

    event(new Registered($user));
    UserStats::increase();
    Auth::login($user);

    return redirect(route('dashboard', absolute: false));
  }
}

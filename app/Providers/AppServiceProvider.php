<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AppServiceProvider extends ServiceProvider
{
  /**
   * Register any application services.
   */
  public function register(): void
  {
    //
  }

  /**
   * Bootstrap any application services.
   */
  public function boot(): void
  {
    Validator::extend('safe_email', function ($attribute, $value, $parameters, $validator) {
      // reject emails containing CRLF
      return !preg_match('/[\r\n]/', $value) && filter_var($value, FILTER_VALIDATE_EMAIL);
    }, 'Invalid email address.');
  }
}

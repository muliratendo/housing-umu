<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    use AuthorizesRequests;  // ← ADD this line; fixes "Undefined method 'authorize'"
    //
}

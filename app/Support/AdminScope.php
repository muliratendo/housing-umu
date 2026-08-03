<?php

namespace App\Support;

use App\Models\Hostel;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AdminScope
{
    public static function hostelsFor(User $user, Builder $query): Builder
    {
        if ($user->hasAnyRole(['super_admin', 'admin', 'dean'])) {
            return $query;
        }

        if ($user->hasRole('warden')) {
            return $query->where('management_type', Hostel::TYPE_CAMPUS);
        }

        if ($user->hasRole('affiliated_admin')) {
            return $query->where('management_type', Hostel::TYPE_AFFILIATED);
        }

        return $query->whereRaw('1 = 0');
    }
}

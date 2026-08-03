<?php
// app/Policies/MaintenanceRequestPolicy.php
declare(strict_types=1);
namespace App\Policies;
use App\Models\{MaintenanceRequest, User};
use Illuminate\Auth\Access\HandlesAuthorization;
class MaintenanceRequestPolicy {
    use HandlesAuthorization;
    public function viewAny(User $user): bool { return $user->can('view maintenance'); }
    public function update(User $user, MaintenanceRequest $req): bool {
        if (!$user->can('update maintenance')) return false;
        if ($user->hasRole('warden') && !$user->hasAnyRole(['super_admin','admin','dean']))
            return $req->room?->hostel?->management_type === 'campus-managed';
        if ($user->hasRole('affiliated_admin') && !$user->hasAnyRole(['super_admin','admin','dean']))
            return $req->room?->hostel?->management_type === 'affiliated';
        return true;
    }
}

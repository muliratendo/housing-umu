<?php
// app/Policies/UserPolicy.php
declare(strict_types=1);
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
class UserPolicy {
    use HandlesAuthorization;
    public function manageRoles(User $user): bool { return $user->can('manage roles and permissions'); }
}

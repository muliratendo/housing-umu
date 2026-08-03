<?php
// app/Policies/BedPolicy.php
declare(strict_types=1);
namespace App\Policies;
use App\Models\{Bed, User};
use Illuminate\Auth\Access\HandlesAuthorization;
class BedPolicy {
    use HandlesAuthorization;
    public function viewAny(User $user): bool { return $user->can('view beds'); }
    public function update(User $user, Bed $bed): bool { return $user->can('update beds'); }
}

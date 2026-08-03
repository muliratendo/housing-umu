<?php
// app/Policies/AcademicTermPolicy.php
declare(strict_types=1);
namespace App\Policies;
use App\Models\{AcademicTerm, User};
use Illuminate\Auth\Access\HandlesAuthorization;
class AcademicTermPolicy {
    use HandlesAuthorization;
    public function manage(User $user): bool { return $user->can('manage semesters'); }
}

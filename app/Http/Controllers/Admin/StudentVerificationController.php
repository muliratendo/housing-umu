<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VerifiedStudentRecord;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentVerificationController extends Controller
{
    // ... your index method can sit here ...

    // 🚀 Place the method safely INSIDE the class body block:
    public function uploadSpreadsheet(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'students' => 'required|array',
            'students.*.reg_number' => 'required|string',
            'students.*.first_name' => 'required|string',
            'students.*.last_name' => 'required|string',
        ]);

        $incomingData = $request->input('students');

        foreach ($incomingData as $studentData) {
            $matchedUser = User::where('email', $studentData['student_email'])
                ->orWhere(function($query) use ($studentData) {
                    $fullName = trim($studentData['first_name'] . ' ' . $studentData['last_name']);
                    $query->where('name', 'LIKE', '%' . $fullName . '%');
                })->first();

            VerifiedStudentRecord::updateOrCreate(
                ['reg_number' => $studentData['reg_number']],
                [
                    'student_email' => $studentData['student_email'] ?? null,
                    'contact'       => $studentData['contact'] ?? null,
                    'first_name'    => $studentData['first_name'],
                    'last_name'     => $studentData['last_name'],
                    'faculty'       => $studentData['faculty'] ?? 'General',
                    'course'        => $studentData['course'] ?? 'General',
                    'gender'        => $studentData['gender'] ?? 'Other',
                    'user_id'       => $matchedUser ? $matchedUser->id : null,
                ]
            );

            if ($matchedUser) {
                $matchedUser->removeRole('student');
                $matchedUser->assignRole('verifiedStudent');
            }
        }

        return back()->with('success', count($incomingData) . ' spreadsheet student records compiled successfully.');
    }

    private function authorizeAdmin()
    {
        // 🚀 FIXED: Pull the user instance directly via the request context helper
        $user = request()->user();

        if (! $user || ! $user->hasAnyRole(['super_admin', 'dean', 'affiliated_admin', 'warden'])) {
            abort(403, 'Unauthorized administrative access portal.');
        }
    }

}

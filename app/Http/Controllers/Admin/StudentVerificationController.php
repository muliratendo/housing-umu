use App\Models\User;
use App\Models\VerifiedStudentRecord;

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
        // Find if a student user exists via email match or fuzzy matching full name combo
        $matchedUser = User::where('email', $studentData['student_email'])
            ->orWhere(function($query) use ($studentData) {
                $fullName = trim($studentData['first_name'] . ' ' . $studentData['last_name']);
                $query->where('name', 'LIKE', '%' . $fullName . '%');
            })->first();

        // Update existing record if reg_number matches, or create a brand new row entry
        $record = VerifiedStudentRecord::updateOrCreate(
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

        // Instantly upgrade role tracking if accounts bridge correctly
        if ($matchedUser) {
            $matchedUser->removeRole('student');
            $matchedUser->assignRole('verifiedStudent');
        }
    }

    return back()->with('success', count($incomingData) . ' spreadsheet student records compiled successfully.');
}

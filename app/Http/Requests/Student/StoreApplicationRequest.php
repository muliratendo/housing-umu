// app/Http/Requests/Student/StoreApplicationRequest.php

<?php
declare(strict_types=1);
namespace App\Http\Requests\Student;

use App\Models\Hostel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gate checked in controller
    }

    public function rules(): array
    {
        return [
            'hostel_id' => ['required', 'integer', 'exists:hostels,id'],
            // ... your other fields
        ];
    }

    /**
     * After-validation: enforce gender policy using the HOSTEL scope,
     * not the room's gender_scope which may be 'mixed' by default.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {

            // Only run if hostel_id itself passed basic validation
            if ($v->errors()->has('hostel_id')) {
                return;
            }

            $hostel  = Hostel::find($this->integer('hostel_id'));
            $student = $this->user()->student;

            if (!$hostel || !$student) {
                return;
            }

            $hostelGender  = $hostel->gender_scope;   // 'male' | 'female' | 'mixed'
            $studentGender = $student->gender;         // 'male' | 'female'

            // 'mixed' hostels accept everyone — no check needed
            if ($hostelGender === 'mixed') {
                return;
            }

            // Gendered hostel — student must match
            if ($hostelGender !== $studentGender) {
                $v->errors()->add(
                    'hostel_id',
                    "This hostel is restricted to {$hostelGender} students only."
                );
            }
        });
    }
}

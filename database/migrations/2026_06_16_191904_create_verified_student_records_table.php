<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('verified_student_records', function (Blueprint $blueprint) {
        $blueprint->id();
        $blueprint->string('reg_number')->unique();     // e.g., "22/UMU/..."
        $blueprint->string('student_email')->nullable();
        $blueprint->string('contact')->nullable();
        $blueprint->string('first_name');               // Includes middle names
        $blueprint->string('last_name');
        $blueprint->string('faculty');
        $blueprint->string('course');
        $blueprint->string('gender');

        $blueprint->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
        $blueprint->timestamps();
    });
    }

    public function down(): void
    {
        Schema::dropIfExists('verified_student_records');
    }
};

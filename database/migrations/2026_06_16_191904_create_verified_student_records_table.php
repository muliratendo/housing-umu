<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('verified_student_records', function (Blueprint $table) {
        $table->id();
        $table->string('reg_number')->unique();     // e.g., "2025-..."
        $table->string('student_email')->nullable();
        $table->string('contact')->nullable();
        $table->string('first_name');               // Includes middle names
        $table->string('last_name');
        $table->string('faculty');
        $table->string('course');
        $table->string('gender');

        $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
        $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
        $table->timestamp('matched_at')->nullable();
        $table->timestamps();
        $table->softDeletes();

        $table->index(['user_id', 'matched_at'], 'idx_verified_records_user_match_time');
    });
    }

    public function down(): void
    {
        Schema::dropIfExists('verified_student_records');
    }
};

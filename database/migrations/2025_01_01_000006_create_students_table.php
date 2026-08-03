<?php
// File: database/migrations/2025_01_01_000005_create_students_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('student_number', 30)->unique();
            $table->string('registration_number', 50)->unique()->nullable();
            $table->enum('gender', ['male', 'female'])->index();
            $table->unsignedSmallInteger('year_of_study')->default(1)->index();
            $table->string('programme', 200)->nullable();
            $table->string('faculty', 200)->nullable();
            $table->date('enrollment_date')->nullable();
            $table->foreignId('current_academic_year_id')->nullable()
                  ->constrained('academic_years')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['user_id', 'year_of_study']);
        });
    }
    public function down(): void { Schema::dropIfExists('students'); }
};

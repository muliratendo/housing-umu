<?php
// File: database/migrations/2025_01_01_000006_create_applications_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('form_id', 36)->unique()->comment('UUID for auto-save');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->foreignId('academic_term_id')->constrained('academic_terms')->cascadeOnDelete();
            $table->foreignId('preferred_room_id')->nullable()->constrained('rooms')->nullOnDelete();
            // BR-2: one application per student per hostel per term
            $table->unique(['student_id', 'hostel_id', 'academic_term_id'], 'uq_student_hostel_term');
            $table->enum('status', [
                'pending', 'allocated', 'waitlisted', 'rejected', 'checked_in', 'checked_out'
            ])->default('pending')->index();
            $table->unsignedSmallInteger('waitlist_position')->nullable()->index();
            $table->json('preferences')->nullable();
            $table->text('notes')->nullable();
            $table->text('special_needs')->nullable();
            $table->boolean('dean_permission_granted')->default(false)->index();
            $table->boolean('warden_permission_granted')->default(false)->index();
            $table->text('permission_notes')->nullable();
            $table->timestamp('permission_granted_at')->nullable();
            $table->foreignId('permission_granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('draft_data')->nullable()->comment('Auto-saved form state');
            $table->timestamp('last_saved_at')->nullable();
            $table->timestamps();
            $table->index(['student_id', 'status']);
            $table->index(['academic_term_id', 'status']);
            $table->index(['hostel_id', 'academic_term_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('applications'); }
};

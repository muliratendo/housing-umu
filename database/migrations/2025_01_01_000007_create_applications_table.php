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
                'pending', 'allocated', 'waitlisted', 'rejected', 'withdrawn', 'checked_in', 'checked_out',
            ])->default('pending')->index();
            $table->boolean('is_draft')->default(true);
            // NEW: category (standard | self-contained | apartment) chosen on
            // the Hostel Detail page — was previously only ever written into
            // draft_data/preferences JSON, never queryable as a real column.
            // AllocationService, the admin AllocateDialog, and Application::show()
            // all need to filter/read this directly, so it's promoted to a
            // first-class column here rather than staying buried in JSON.
            $table->string('room_type', 32)->nullable();
            // NEW: occupancy (1 = single, 2 = double) chosen alongside room_type.
            $table->unsignedTinyInteger('capacity')->nullable();
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
            $table->softDeletes();

            $table->index(['student_id', 'status']);
            $table->index(['academic_term_id', 'status']);
            $table->index(['hostel_id', 'academic_term_id', 'status']);
            // NEW: AllocateDialog's "matching vs other" grouping and
            // AllocationService::resolveAvailableBed()'s category-restricted
            // search both filter on room_type per hostel — index it.
            $table->index(['hostel_id', 'room_type']);
        });
    }
    public function down(): void { Schema::dropIfExists('applications'); }
};

<?php
// File: database/migrations/2025_01_01_000007_create_allocations_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('hostel_id')->constrained('hostels')->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->foreignId('bed_id')->nullable()->constrained('beds')->nullOnDelete();
            $table->foreignId('academic_term_id')->constrained('academic_terms')->cascadeOnDelete();
            // BR-1: one active allocation per bed per hostel per semester
            $table->unsignedTinyInteger('bed_number')->default(1);
            $table->unique(['room_id', 'bed_number', 'academic_term_id'], 'uq_bed_per_term');
            $table->enum('status', [
                'allocated', 'checked_in', 'checked_out', 'evicted', 'cancelled'
            ])->default('allocated')->index();
            $table->boolean('is_retained')->default(false)->index();
            $table->foreignId('retained_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('retention_notes')->nullable();
            $table->boolean('is_admin_override')->default(false);
            $table->text('admin_notes')->nullable();
            $table->foreignId('override_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['student_id', 'academic_term_id', 'status']);
            $table->index(['hostel_id', 'academic_term_id', 'status']);
            $table->index(['room_id', 'academic_term_id']);
            $table->index('bed_id');
        });
    }
    public function down(): void { Schema::dropIfExists('allocations'); }
};

<?php
// File: database/migrations/2025_01_01_000002_create_academic_terms_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('academic_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->string('name', 50)->comment('Semester 1 / Semester 2');
            $table->enum('semester', ['1', '2', '3'])->default('1');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false)->index();
            $table->date('application_window_open')->nullable();
            $table->date('application_window_close')->nullable();
            $table->timestamps();
            $table->index(['academic_year_id', 'is_current']);
        });
    }
    public function down(): void { Schema::dropIfExists('academic_terms'); }
};

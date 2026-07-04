<?php
// File: database/migrations/2025_01_01_000001_create_academic_years_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('label', 20)->unique()->comment('e.g. 2025/2026');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false)->index();
            $table->timestamps();
            $table->index(['start_date', 'end_date']);
        });
    }
    public function down(): void { Schema::dropIfExists('academic_years'); }
};

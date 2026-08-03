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
            $table->string('name', 20)->nullable();
            $table->unsignedSmallInteger('start_year')->nullable();
            $table->unsignedSmallInteger('end_year')->nullable();
            $table->string('label', 20)->unique()->comment('e.g. 2025/2026');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['start_date', 'end_date']);
        });

        // Backfill from existing rows using start_date/end_date/label —
        // runs once, safe to re-run (idempotent where clause).
        DB::table('academic_years')->whereNull('start_year')->orderBy('id')->each(function ($row) {
            $startYear = (int) date('Y', strtotime($row->start_date));
            $endYear   = (int) date('Y', strtotime($row->end_date));

            DB::table('academic_years')
                ->where('id', $row->id)
                ->update([
                    'name'       => $row->label ?? "{$startYear}/{$endYear}",
                    'start_year' => $startYear,
                    'end_year'   => $endYear,
                ]);
        });

        // Now that every row is backfilled, enforce NOT NULL going forward.
        Schema::table('academic_years', function (Blueprint $table) {
            $table->string('name', 20)->nullable(false)->change();
            $table->unsignedSmallInteger('start_year')->nullable(false)->change();
            $table->unsignedSmallInteger('end_year')->nullable(false)->change();
        });
    }
    public function down(): void { Schema::dropIfExists('academic_years'); }
};

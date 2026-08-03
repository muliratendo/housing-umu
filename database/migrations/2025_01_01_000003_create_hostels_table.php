<?php
// File: database/migrations/2025_01_01_000003_create_hostels_table.php
// REPLACE existing. hostels table NEVER has bed_count or price_per_semester.
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('hostels', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 180)->unique();
            $table->string('location', 250)->nullable();
            $table->string('management_type', 20)->default('campus-managed'); // campus-managed | affiliated
            $table->string('campus_location', 20)->default('on-campus');     // on-campus | off-campus
            $table->string('availability_status', 20)->default('available'); // available | limited | full | closed
            $table->string('gender_scope', 10)->default('mixed');           // male | female | mixed
            $table->boolean('applications_open')->default(false);
            $table->boolean('is_religious_order')->default(false);
            $table->text('religious_notes')->nullable();
            $table->json('amenities')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
            $table->index(['management_type','availability_status'], 'idx_hostels_mgmt_avail');
            $table->index(['gender_scope','campus_location'],        'idx_hostels_gender_campus');
            $table->softDeletes();

            $table->index('applications_open');
        });
    }
    public function down(): void { Schema::dropIfExists('hostels'); }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('hostels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('location'); // Nkozi zone strings
            $table->integer('price_per_semester'); // Rent in UGX
            $table->integer('bed_count')->default(2); // 1 = Single, 2 = Double
            $table->enum('room_type', ['self-contained', 'non-self-contained', 'apartment']);
            $table->string('management_type')->default('Affiliated');
            $table->enum('availability_status', ['available', 'limited', 'full'])->default('available');
            $table->enum('gender_scope', ['Male', 'Female', 'Mixed'])->default('Mixed');
            $table->boolean('is_religious_order')->default(false); // Clergy rules
            $table->text('religious_notes')->nullable(); // Nuns/Fathers restrictions text
            $table->string('image_url')->nullable();
            $table->json('amenities')->nullable(); // Arrays like Wi-Fi, Water, Security
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hostels');
    }
};

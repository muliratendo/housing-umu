<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hostel_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('name');
            $table->string('slug')->unique();

            $table->enum('room_type', [
                'self-contained',
                'non-self-contained',
                'apartment',
            ]);

            $table->unsignedInteger('capacity');

            $table->unsignedTinyInteger('bed_count')->default(1);

            $table->decimal('price_per_semester', 12, 2)->nullable();

            $table->enum('availability_status', [
                'available',
                'limited',
                'full',
            ])->default('available');

            $table->enum('gender_scope', [
                'male',
                'female',
                'mixed',
            ])->nullable();

            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->json('amenities')->nullable();

            $table->timestamps();

            $table->index(['hostel_id', 'room_type']);
            $table->index(['hostel_id', 'gender_scope']);
            $table->index(['hostel_id', 'availability_status']);
            $table->index('slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};

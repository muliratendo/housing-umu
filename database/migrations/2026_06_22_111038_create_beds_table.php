<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Bed;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('label', 50);
            $table->string('status', 20)->default(Bed::STATUS_AVAILABLE);
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->unique(['room_id', 'label']);
            $table->index(['room_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beds');
    }
};

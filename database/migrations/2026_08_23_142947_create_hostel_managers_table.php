<?php

use App\Models\Hostel;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hostel_managers', function (Blueprint $table) {
            $table->id();

            $table->foreignIdFor(Hostel::class)
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignIdFor(User::class)
                ->constrained()
                ->cascadeOnDelete();

            $table->timestamps();

            // Prevent assigning the same manager to the same hostel twice.
            $table->unique(['hostel_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hostel_managers');
    }
};

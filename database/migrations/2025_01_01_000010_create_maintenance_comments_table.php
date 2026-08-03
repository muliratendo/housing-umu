<?php
// File: database/migrations/2025_01_01_000009_create_maintenance_comments_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')
                  ->constrained('maintenance_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_internal')->default(false)->comment('Admin-only notes');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['maintenance_request_id', 'created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('maintenance_comments'); }
};

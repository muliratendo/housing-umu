<?php
/**
 * FILE: database/migrations/2026_08_05_000000_create_client_ux_logs_table.php
 * PURPOSE: Storage for frontend UX-state telemetry (empty/error/silent-failure
 * events). Indexed on reason_code + component so admins/devs can quickly
 * answer "how often is the applications list empty, and why?".
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_ux_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('state_type', 40);
            $table->string('component', 120)->index();
            $table->string('user_flow', 20);
            $table->string('reason_code', 80)->index();
            $table->string('message', 500);
            $table->json('meta')->nullable();
            $table->string('correlation_id', 64)->index();
            $table->string('client_url', 255);
            $table->timestamp('client_ts');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_ux_logs');
    }
};

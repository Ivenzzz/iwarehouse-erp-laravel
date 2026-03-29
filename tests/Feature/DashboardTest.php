<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login_when_visiting_the_dashboard(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_the_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
    }
}

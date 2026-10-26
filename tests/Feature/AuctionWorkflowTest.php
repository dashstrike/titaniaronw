<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuctionWorkflowTest extends TestCase
{
    public function test_development_workflow_controls_are_gated_and_shared(): void
    {
        config(['titania.auction_workflow' => true]);
        $this->get('/auction')->assertOk()
            ->assertSee('id="auctionBanForm"', false)
            ->assertSee('id="accessoryBanForm"', false)
            ->assertSeeInOrder(['id="auctionBanList"', 'id="auctionDuckWiggle"'], false)
            ->assertSee('id="auctionActionHistory"', false);
        $this->get('/titaniaauction')->assertOk()
            ->assertSeeInOrder(['id="auctionBanList"', 'id="auctionDuckWiggle"'], false)
            ->assertDontSee('id="accessoryBanList"', false)
            ->assertDontSee('id="auctionBanForm"', false)
            ->assertDontSee('id="auctionActionHistory"', false);
        config(['titania.auction_workflow' => false]);
        $this->get('/auction')->assertOk()->assertDontSee('id="auctionBanForm"', false);
    }

    public function test_development_connection_cannot_be_exported(): void
    {
        config(['titania.development_project' => 'development-test', 'titania.supabase_url' => 'https://development-test.supabase.co', 'titania.supabase_publishable_key' => 'sb_publishable_test']);
        $this->artisan('pages:export', ['--url' => 'https://example.github.io/titaniaronw'])->assertFailed();
    }

    public function test_local_site_rejects_a_different_database(): void
    {
        $this->app->instance('env', 'local');
        config(['titania.development_project' => 'development-test', 'titania.supabase_url' => 'https://live-test.supabase.co']);
        $this->get('/titaniaauction')->assertStatus(503);
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class RelicAuctionTest extends TestCase
{
    public function test_relic_stats_have_the_requested_order_colors_and_shared_local_icon(): void
    {
        $items = config('relic');
        $this->assertSame(['str', 'agi', 'vit', 'dex', 'int', 'luk'], array_column($items, 'id'));
        $this->assertSame(['danger', 'warning', 'success', 'orange', 'info', 'purple'], array_column($items, 'color'));
        $image = file_get_contents(public_path('images/relic/icon_zhujiemian_hallows_01.webp'));
        $this->assertSame('RIFF', substr($image, 0, 4));
        $this->assertSame('WEBP', substr($image, 8, 4));
        config(['titania.auction_workflow' => true]);
        foreach (['/auction', '/titaniaauction'] as $url) {
            $response = $this->get($url)->assertOk()
                ->assertSee('id="relicRegisterForm"', false)
                ->assertSee('id="relicRegistrations"', false)
                ->assertSee('css/auction-relic.css', false)
                ->assertDontSee('Coming soon...');
            $response->assertSeeInOrder(array_map(fn ($item) => 'value="'.$item['id'].'" data-name="'.$item['name'].'"', $items), false);
            if ($url === '/auction') {
                $response->assertSee('id="relicBanForm"', false)->assertSee('id="relicActionHistory"', false);
            } else {
                $response->assertDontSee('id="relicBanForm"', false);
            }
        }
        $this->get('/member')->assertOk()->assertSee('memberRelicHistoryContent')->assertSee('TITANIA_AUCTION_RELICS');
    }
}

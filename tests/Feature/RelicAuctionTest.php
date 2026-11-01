<?php

namespace Tests\Feature;

use Tests\TestCase;

class RelicAuctionTest extends TestCase
{
    public function test_relic_stats_have_the_requested_order_colors_and_type_icons(): void
    {
        $items = config('relic');
        $this->assertCount(12, $items);
        $stats = ['str', 'agi', 'vit', 'dex', 'int', 'luk'];
        $this->assertSame(array_merge(array_map(fn ($stat) => 'bane_'.$stat, $stats), array_map(fn ($stat) => 'guard_'.$stat, $stats)), array_column($items, 'id'));
        $this->assertSame(['danger', 'warning', 'success', 'orange', 'info', 'purple'], array_column(array_slice($items, 0, 6), 'color'));
        foreach (['bane', 'guard'] as $type) {
            $image = file_get_contents(public_path('images/relic/'.$type.'-cutout.png'));
            $this->assertSame("\x89PNG\r\n\x1a\n", substr($image, 0, 8));
        }
        config(['titania.auction_workflow' => true]);
        foreach (['/auction', '/titaniaauction'] as $url) {
            $response = $this->get($url)->assertOk()
                ->assertSee('id="relicRegisterForm"', false)
                ->assertSee('id="relicType"', false)
                ->assertSee('id="relicRegistrations"', false)
                ->assertSee('css/auction-relic.css', false)
                ->assertDontSee('Coming soon...');
            $response->assertSeeInOrder(array_map(fn ($item) => 'value="'.$item['id'].'" data-name="'.$item['name'].'"', $items), false);
            foreach ($items as $item) {
                $this->assertSame(strtoupper($item['stat']).' Relic ('.ucfirst($item['type']).')', $item['name']);
                $response->assertSee('data-effect="'.strtoupper($item['stat']).' +10"', false);
            }
            if ($url === '/auction') {
                $response->assertSee('id="relicBanForm"', false)->assertSee('id="relicActionHistory"', false);
            } else {
                $response->assertDontSee('id="relicBanForm"', false);
            }
        }
        $this->get('/member')->assertOk()->assertSee('memberRelicHistoryContent')->assertSee('TITANIA_AUCTION_RELICS');
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class AccessoryAuctionTest extends TestCase
{
    public function test_both_pages_include_all_accessories_and_their_details(): void
    {
        $items = config('accessory');
        $this->assertCount(14, $items);
        $this->assertCount(14, array_unique(array_column($items, 'id')));

        foreach (['/auction', '/titaniaauction'] as $url) {
            $response = $this->get($url)->assertOk()
                ->assertSee('id="auctionRegisterForm"', false)
                ->assertSee('id="accessoryRegisterForm"', false)
                ->assertSee('id="accessoryRegistrations"', false)
                ->assertDontSee('No accessories available yet.');

            foreach ($items as $item) {
                $this->assertSame(90, $item['level']);
                $this->assertNotEmpty($item['attributes']);
                $this->assertNotEmpty($item['effects']);
                $this->assertNotEmpty($item['sets']);
                $image = file_get_contents(public_path($item['image']));
                $this->assertSame('RIFF', substr($image, 0, 4));
                $this->assertSame('WEBP', substr($image, 8, 4));
                $response->assertSee('value="'.$item['id'].'"', false)
                    ->assertSee('id="accessoryDetails-'.$item['id'].'"', false)
                    ->assertSee(e($item['name']), false);
            }
        }
    }
}

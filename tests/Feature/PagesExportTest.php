<?php

namespace Tests\Feature;

use DOMDocument;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class PagesExportTest extends TestCase
{
    public function test_export_resolves_pages_and_assets_without_shipping_server_files(): void
    {
        config(['titania.supabase_url' => 'https://example.supabase.co', 'titania.supabase_publishable_key' => 'sb_publishable_test', 'database.default' => 'not-configured']);
        $base = 'https://example.github.io/titaniaronw/';
        $this->artisan('pages:export', ['--url' => rtrim($base, '/')])->assertSuccessful();
        $output = storage_path('app/pages');
        $pages = File::glob($output.'/*/index.html');
        $pages = array_merge($pages, File::glob($output.'/public/*/index.html'));
        $this->assertCount(19, $pages);
        foreach ($pages as $file) {
            $html = File::get($file);
            $this->assertStringNotContainsString('127.0.0.1', $html);
            $this->assertStringNotContainsString('localhost', $html);
            $dom = new DOMDocument;
            @$dom->loadHTML($html);
            foreach (['script' => 'src', 'link' => 'href', 'img' => 'src', 'a' => 'href'] as $tag => $attribute) {
                foreach ($dom->getElementsByTagName($tag) as $element) {
                    $value = $element->getAttribute($attribute);
                    if ($value === '' || str_starts_with($value, '#') || preg_match('~^(https?:|data:|javascript:|mailto:)~', $value) && ! str_starts_with($value, $base)) {
                        continue;
                    }
                    $relative = str_starts_with($value, $base) ? substr($value, strlen($base)) : preg_replace('~^\./~', '', $value);
                    $path = $output.'/'.explode('?', explode('#', $relative)[0])[0];
                    $this->assertTrue(is_file($path) || is_file(rtrim($path, '/').'/index.html'), 'Missing static target: '.$value);
                }
            }
        }
        foreach (File::allFiles($output) as $file) {
            $this->assertNotContains($file->getExtension(), ['php', 'env', 'sql']);
        }
        $this->assertFileDoesNotExist($output.'/.env');
        $this->assertFileDoesNotExist($output.'/composer.json');
        $this->assertStringContainsString('location.search+location.hash', File::get($output.'/index.html'));

        // Pages resolves /guild-league and /siege through the matching .html alias.
        foreach (['guild-league', 'siege'] as $page) {
            $alias = File::get($output.'/'.$page.'.html');
            $target = json_encode($base.$page.'/', JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
            $this->assertStringContainsString('location.replace('.$target.'+location.search+location.hash)', $alias);
            $this->assertStringNotContainsString('public', $alias);
            $this->assertStringContainsString('data-titania-page="index"', File::get($output.'/'.$page.'/index.html'));
            $this->assertStringContainsString('data-titania-public="true"', File::get($output.'/public/'.$page.'/index.html'));
        }
    }

    public function test_export_rejects_privileged_keys(): void
    {
        config(['titania.supabase_url' => 'https://example.supabase.co', 'titania.supabase_publishable_key' => 'sb_secret_do_not_publish']);
        $this->artisan('pages:export', ['--url' => 'https://example.github.io/titaniaronw'])->assertFailed();
    }
}

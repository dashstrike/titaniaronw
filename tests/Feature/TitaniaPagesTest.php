<?php

namespace Tests\Feature;

use DOMDocument;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TitaniaPagesTest extends TestCase
{
    public static function pages(): array
    {
        return [
            ['/login', 'authScreen'],
            ['/help', 'titania-content'],
            ['/members', 'authScreen'],
            ['/dashboard', 'teamsWrap'],
            ['/guild-league', 'teamsWrap'],
            ['/siege', 'teamsWrap'],
            ['/attendance', 'teamsWrap'],
            ['/public/guild-league', 'content'],
            ['/public/siege', 'content'],
            ['/public/polarity-zone', 'content'],
            ['/member?id=existing-member', 'memberName'],
            ['/parties', 'partyGrid'],
            ['/users', 'usersList'],
            ['/member-import-preview', 'state'],
            ['/guild-runs', 'createRunForm'],
            ['/guild-runs-history', 'loading'],
            ['/titaniaruns', 'loading'],
        ];
    }

    #[DataProvider('pages')]
    public function test_pages_preserve_workflow_hooks_and_resolve_local_assets(string $url, string $element): void
    {
        // Rendering must not require any new Laravel database or Supabase network call.
        config(['database.default' => 'not-configured']);

        $response = $this->get($url)->assertOk()
            ->assertSee('id="'.$element.'"', false)
            ->assertSee('vendor/darkone/css/style.min.css', false)
            ->assertSee('images/titania-logo.webp', false)
            ->assertDontSee('./pub/', false)
            ->assertDontSee('data:image/webp;base64,', false);

        $document = new DOMDocument;
        @$document->loadHTML($response->getContent());
        $ids = [];
        foreach ($document->getElementsByTagName('*') as $node) {
            if ($node->hasAttribute('id')) {
                $id = $node->getAttribute('id');
                $this->assertNotContains($id, $ids, 'Duplicate DOM ID: '.$id);
                $ids[] = $id;
            }
        }
        foreach ($document->getElementsByTagName('a') as $link) {
            $this->assertStringNotContainsString('.html', $link->getAttribute('href'));
            if ($link->hasAttribute('data-planner-event')) {
                $this->assertStringNotContainsString('#', $link->getAttribute('href'));
            }
        }
        foreach (['script' => 'src', 'link' => 'href', 'img' => 'src'] as $tag => $attribute) {
            foreach ($document->getElementsByTagName($tag) as $node) {
                $asset = $node->getAttribute($attribute);
                if ($asset === '' || str_starts_with($asset, 'data:')) {
                    continue;
                }
                $host = parse_url($asset, PHP_URL_HOST);
                if ($host && ! in_array($host, ['localhost', 'titaniaronw.test'], true)) {
                    continue;
                }
                $assetPath = ltrim(parse_url($asset, PHP_URL_PATH), './');
                $this->assertFileExists(public_path($assetPath), 'Missing asset: '.$asset);
            }
        }
    }

    public function test_only_public_supabase_configuration_is_rendered(): void
    {
        config([
            'titania.supabase_url' => 'https://example.supabase.co',
            'titania.supabase_publishable_key' => 'sb_publishable_example',
            'titania.service_role_key' => 'private-service-key-do-not-render',
        ]);

        $this->get('/dashboard')->assertOk()
            ->assertSee('sb_publishable_example', false)
            ->assertDontSee('private-service-key-do-not-render', false);
    }

    public function test_private_files_and_arbitrary_views_are_not_routed(): void
    {
        foreach (['/.env', '/composer.json', '/sql/titania_setup.sql', '/missing.html', '/layouts/app.html'] as $url) {
            $this->get($url)->assertNotFound();
        }
    }

    public function test_job_map_points_to_existing_images(): void
    {
        $map = json_decode(file_get_contents(public_path('images/job/job-icons.json')), true, 512, JSON_THROW_ON_ERROR);
        $this->assertNotEmpty($map);
        foreach ($map as $image) {
            $this->assertFileExists(public_path('images/job/'.$image));
        }
    }

    public function test_legacy_urls_redirect_to_clean_routes_with_query_parameters(): void
    {
        foreach (['index', 'guild-league', 'siege', 'polarity-zone', 'member', 'parties', 'users',
            'member-import-preview', 'guild-runs', 'guild-runs-history', 'titaniaruns'] as $page) {
            $this->get('/'.$page.'.html?id=existing-member&code=example-code')
                ->assertStatus(301)
                ->assertRedirect(route($page === 'index' ? 'dashboard' : $page, ['id' => 'existing-member', 'code' => 'example-code']));
        }
        foreach (['/', '/home', '/index'] as $url) {
            $this->get($url.'?code=example-code')->assertRedirect(route('dashboard', ['code' => 'example-code']));
        }
    }
}

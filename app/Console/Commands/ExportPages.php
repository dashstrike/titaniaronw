<?php

namespace App\Console\Commands;

use App\Http\Controllers\PageController;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

class ExportPages extends Command
{
    protected $signature = 'pages:export {--url= : Public site URL, including the repository path}';

    protected $description = 'Export Titania views and browser assets for GitHub Pages';

    public function handle(): int
    {
        $base = rtrim($this->option('url') ?: config('app.url'), '/');
        $key = config('titania.supabase_publishable_key');
        $parts = explode('.', $key);
        $claims = count($parts) === 3 ? json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true) : [];
        if (! filter_var($base, FILTER_VALIDATE_URL) || ! filter_var(config('titania.supabase_url'), FILTER_VALIDATE_URL)) {
            $this->error('Set a valid site URL and SUPABASE_URL before exporting.');

            return self::FAILURE;
        }
        if (! str_starts_with($key, 'sb_publishable_') && ($claims['role'] ?? '') !== 'anon') {
            $this->error('Export requires a Supabase publishable key or legacy anon key, never a privileged key.');

            return self::FAILURE;
        }

        // Only this fixed generated directory is replaced. Never export the project root.
        $output = storage_path('app/pages');
        File::deleteDirectory($output);
        File::ensureDirectoryExists($output);
        URL::forceRootUrl($base);
        URL::forceScheme(parse_url($base, PHP_URL_SCHEME));
        foreach (['css', 'js', 'images', 'vendor'] as $directory) {
            File::copyDirectory(public_path($directory), $output.'/'.$directory);
        }
        foreach (['config.js', 'robots.txt'] as $file) {
            File::copy(public_path($file), $output.'/'.$file);
        }
        File::put($output.'/.nojekyll', '');

        $count = 0;
        foreach (Route::getRoutes() as $route) {
            if (! isset($route->defaults['page'])) {
                continue;
            }
            $request = Request::create('/'.$route->uri());
            $route->bind($request);
            $request->setRouteResolver(fn () => $route);
            $html = app(PageController::class)->show($request)->render();
            $directory = $output.'/'.$route->uri();
            File::ensureDirectoryExists($directory);
            File::put($directory.'/index.html', $html);
            $count++;
        }

        $redirects = ['index.html' => 'dashboard', 'index/index.html' => 'dashboard', 'home/index.html' => 'dashboard'];
        foreach (['index', 'guild-league', 'siege', 'polarity-zone', 'member', 'parties', 'users', 'member-import-preview', 'guild-runs', 'guild-runs-history', 'titaniaruns', 'maps-gl', 'maps-siege'] as $page) {
            if ($page === 'index') {
                continue;
            }
            // GitHub Pages can serve foo.html for /foo before foo/index.html.
            // Keep these aliases on the same page as their clean management URLs.
            $redirects[$page.'.html'] = $page === 'polarity-zone' ? 'public/'.$page : $page;
        }
        foreach ($redirects as $file => $target) {
            File::ensureDirectoryExists(dirname($output.'/'.$file));
            $url = $base.'/'.$target.'/';
            $encoded = json_encode($url, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
            File::put($output.'/'.$file, '<!doctype html><html lang="en"><meta charset="utf-8"><title>Titania</title><script>location.replace('.$encoded.'+location.search+location.hash);</script><a href="'.e($url).'">Continue to Titania</a></html>');
        }
        File::put($output.'/404.html', '<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found</title><h1>Page not found</h1><a href="'.e($base.'/').'">Return to Titania</a></html>');
        $this->info("Exported {$count} pages to storage/app/pages.");

        return self::SUCCESS;
    }
}

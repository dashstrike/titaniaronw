<?php

use App\Http\Controllers\PageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', fn (Request $request) => redirect()->route('dashboard', $request->query()))->name('home');

Route::get('/dashboard', [PageController::class, 'show'])->defaults('page', 'index')->name('dashboard');
Route::get('/login', [PageController::class, 'show'])->defaults('page', 'index')->name('login');
Route::get('/index', fn (Request $request) => redirect()->route('dashboard', $request->query(), 301))->name('index');
Route::get('/home', fn (Request $request) => redirect()->route('dashboard', $request->query(), 301));

foreach (['members' => 'manage_members', 'guild-league' => 'guild_league', 'siege' => 'siege', 'attendance' => 'attendance'] as $path => $event) {
    Route::get('/'.$path, [PageController::class, 'show'])
        ->defaults('page', 'index')
        ->defaults('plannerEvent', $event)
        ->name('planner.'.$event);
}

foreach (['guild-league', 'siege', 'polarity-zone', 'member', 'parties', 'users',
    'member-import-preview', 'guild-runs', 'guild-runs-history', 'titaniaruns', 'auction', 'titaniaauction', 'help', 'maps-gl', 'maps-siege', 'pvp-guild-league', 'pvp-siege'] as $page) {
    $path = in_array($page, ['guild-league', 'siege', 'polarity-zone'], true) ? 'public/'.$page : $page;
    Route::get('/'.$path, [PageController::class, 'show'])
        ->defaults('page', $page)
        ->name($page);
}

// Old bookmarks retain their query parameters; browsers retain URL fragments.
foreach (['index', 'guild-league', 'siege', 'polarity-zone', 'member', 'parties', 'users',
    'member-import-preview', 'guild-runs', 'guild-runs-history', 'titaniaruns', 'maps-gl', 'maps-siege'] as $page) {
    Route::get('/'.$page.'.html', fn (Request $request) => redirect()->route($page === 'index' ? 'dashboard' : $page, $request->query(), 301));
}

<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function show(Request $request): View
    {
        $page = $request->route('page', 'index');

        return view('pages.'.$page, [
            'page' => $page,
            'plannerEvent' => $request->route('plannerEvent', 'dashboard'),
            'publicPage' => in_array($page, ['guild-league', 'siege', 'polarity-zone', 'titaniaruns'], true),
            // Only browser-safe settings are exposed. Supabase still governs all data access.
            'browserConfig' => [
                'supabaseUrl' => config('titania.supabase_url'),
                'supabasePublishableKey' => config('titania.supabase_publishable_key'),
                'appName' => config('app.name'),
            ],
        ]);
    }
}

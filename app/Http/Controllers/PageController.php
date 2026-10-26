<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function show(Request $request): View
    {
        if (app()->environment('local') && config('titania.development_project')) {
            abort_unless(parse_url(config('titania.supabase_url'), PHP_URL_HOST) === config('titania.development_project').'.supabase.co', 503, 'Local development must use the development Supabase project.');
        }
        $page = $request->route('page', 'index');

        return view('pages.'.$page, [
            'page' => $page,
            'plannerEvent' => $request->route('plannerEvent', 'dashboard'),
            'publicPage' => in_array($page, ['guild-league', 'siege', 'polarity-zone', 'titaniaruns', 'titaniaauction'], true),
            // Only browser-safe settings are exposed. Supabase still governs all data access.
            'browserConfig' => [
                'supabaseUrl' => config('titania.supabase_url'),
                'supabasePublishableKey' => config('titania.supabase_publishable_key'),
                'appName' => config('app.name'),
                'auctionWorkflow' => (bool) config('titania.auction_workflow'),
                'localDevelopment' => app()->environment('local') && (bool) config('titania.development_project'),
            ],
        ]);
    }
}

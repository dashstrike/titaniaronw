<?php

return [
    'supabase_url' => env('SUPABASE_URL', ''),
    'supabase_publishable_key' => env('SUPABASE_PUBLISHABLE_KEY', ''),
    'asset_version' => env('TITANIA_ASSET_VERSION', 'laravel-1'),
    'development_project' => env('TITANIA_DEVELOPMENT_PROJECT', ''),
    'auction_workflow' => env('TITANIA_AUCTION_WORKFLOW', false),
];

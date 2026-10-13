<!DOCTYPE html>
<html lang="en" data-bs-theme="dark" data-theme="dark" data-sidebar-color="dark" data-topbar-color="dark" data-titania-page="{{ $page }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="{{ rtrim(url('/'), '/') }}/" target="_top">
    <title>@yield('title', config('app.name'))</title>
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('images/favicon-32.png') }}">
    <link rel="icon" type="image/png" sizes="192x192" href="{{ asset('images/favicon-192.png') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('images/apple-touch-icon.png') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/vendor.min.css') }}">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/icons.min.css') }}">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/style.min.css') }}">
    <script src="{{ asset('vendor/darkone/js/config.js') }}"></script>
    <script>window.TITANIA_CONFIG = Object.freeze({{ Illuminate\Support\Js::from($browserConfig) }});</script>
    <script src="{{ asset('js/titania-toasts.js') }}?v={{ filemtime(public_path('js/titania-toasts.js')) }}"></script>
    @stack('head')
    <link rel="stylesheet" href="{{ asset('css/titania.css') }}?v={{ filemtime(public_path('css/titania.css')) }}">
    <link rel="stylesheet" href="{{ asset('css/tooltips.css') }}?v={{ filemtime(public_path('css/tooltips.css')) }}">
</head>
<body data-titania-page="{{ $page }}" data-titania-public="{{ $publicPage ? 'true' : 'false' }}" @yield('body-attributes')>
    <div class="app-wrapper">
        @unless($publicPage)
            @include('partials.sidebar')
            @include('partials.topbar')
        @endunless
        <div class="page-content{{ $publicPage ? ' pt-3' : '' }}" id="titania-page-content" @if($page === 'index' || $publicPage) style="margin-left:0" @endif>
            <div class="container-fluid">
                <div id="titania-content">
                    @yield('content')
                </div>
            </div>
            <footer class="footer" id="titania-footer" @if($page === 'index') hidden @endif>
                <div class="container-fluid text-center text-muted">Titania Guild Management · Dark Lord Server</div>
            </footer>
        </div>
    </div>
    <div class="toast-container position-fixed top-0 end-0 p-3" id="toastStack" aria-live="polite" aria-atomic="false"></div>
    <script src="{{ asset('vendor/darkone/js/vendor.min.js') }}"></script>
    <script src="{{ asset('vendor/darkone/js/app.js') }}"></script>
    <script src="{{ asset('js/titania-layout.js') }}?v={{ filemtime(public_path('js/titania-layout.js')) }}"></script>
    <script src="{{ asset('js/tooltips-global.js') }}?v={{ filemtime(public_path('js/tooltips-global.js')) }}"></script>
</body>
</html>

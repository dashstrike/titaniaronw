<!DOCTYPE html>
<html lang="en" data-bs-theme="dark" data-theme="dark" data-sidebar-color="dark" data-topbar-color="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page Not Found · Titania</title>
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('images/favicon-32.png') }}">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/vendor.min.css') }}">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/icons.min.css') }}">
    <link rel="stylesheet" href="{{ asset('vendor/darkone/css/style.min.css') }}">
    <link rel="stylesheet" href="{{ asset('css/titania.css') }}?v={{ filemtime(public_path('css/titania.css')) }}">
</head>
<body>
    <main class="min-vh-100 d-flex align-items-center justify-content-center p-3">
        <div class="container text-center">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card p-4 p-md-5">
                        <img src="{{ asset('images/titania-logo.webp') }}" width="72" height="72" class="mx-auto mb-3" alt="Titania">
                        <p class="display-1 fw-bold text-primary mb-2">404</p>
                        <h1 class="h3 mb-2">Page not found</h1>
                        <p class="text-muted mb-4">The page you requested could not be found.</p>
                        <div>
                            <a href="{{ url('/') }}" class="btn btn-primary d-inline-flex align-items-center justify-content-center"><i class="fa-solid fa-arrow-left me-2" aria-hidden="true"></i>Return to Titania</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</body>
</html>

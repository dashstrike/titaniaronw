@extends('layouts.app')

@section('title', 'Titania · Auction')

@push('head')
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet">
<link rel="stylesheet" href="{{ asset('css/guild-runs.css') }}?v={{ filemtime(public_path('css/guild-runs.css')) }}">
<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="{{ asset('js/config.js') }}?v={{ filemtime(public_path('js/config.js')) }}"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="{{ asset('js/auction.js') }}?v={{ filemtime(public_path('js/auction.js')) }}" defer></script>
@endpush

@section('content')
<header class="card d-flex flex-row align-items-center justify-content-between flex-wrap gap-3 p-3 mb-4">
    <div class="d-flex align-items-center gap-3 flex-wrap">
    <div class="d-flex align-items-center">
        <img src="{{ asset('images/titania-logo.webp') }}" width="46" height="46" class="mr-2" alt="Titania">
        <div><strong>TITANIA AUCTION</strong><div class="small text-muted">Register for cards and accessories</div></div>
    </div>
    @include('partials.discord-button', ['mobile' => false])
    </div>
    @include('partials.theme-toggle')
    @include('partials.discord-button', ['mobile' => true])
</header>
@include('partials.auction', ['organizer' => false])
@endsection

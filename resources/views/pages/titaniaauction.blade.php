@extends('layouts.app')

@section('title', 'Titania · Auction')

@push('head')
<link rel="stylesheet" href="{{ asset('css/guild-runs.css') }}?v={{ filemtime(public_path('css/guild-runs.css')) }}">


<script src="{{ asset('js/config.js') }}?v={{ filemtime(public_path('js/config.js')) }}"></script>

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

@extends('layouts.app')

@section('title', "Titania · Siege")

@section('body-attributes') data-view="siege"@endsection

@push('head')
<link rel="stylesheet" href="{{ asset('css/pages/siege.css') }}?v={{ filemtime(public_path('css/pages/siege.css')) }}">
@endpush

@section('content')
<div class="page">
  <header class="viewerbar card flex-row align-items-center justify-content-between flex-wrap gap-3 p-3 mb-3">
    <div class="mini-brand"><img class="logo" src="images/titania-logo.webp" alt="Titania guild logo"><div><b>TITANIA</b><span>Dark Lord Server</span></div></div>
    <nav class="nav gap-2">
      <a class="btn btn-outline-primary" href="public/guild-league"><i class="fa-solid fa-shield-halved mr-2" aria-hidden="true"></i>Guild League</a>
      <a class="btn btn-danger active" href="public/siege"><i class="fa-regular fa-chess-rook mr-2" aria-hidden="true"></i>Siege/Polarity</a>
      @include('partials.theme-toggle')
      <button class="tool-btn btn btn-outline-secondary" id="refreshBtn" aria-label="Refresh" title="Refresh"><i class="fa-solid fa-arrows-rotate mr-2" aria-hidden="true"></i><span class="refresh-label">Refresh</span></button>
    </nav>
    <nav class="mobile-event-nav" aria-label="Public lineup pages">
      <a class="btn btn-outline-primary" href="public/guild-league"><i class="fa-solid fa-shield-halved mr-2" aria-hidden="true"></i>Guild League</a>
      <a class="btn btn-danger active" href="public/siege"><i class="fa-regular fa-chess-rook mr-2" aria-hidden="true"></i>Siege/Polarity</a>
    </nav>
  </header>
  <main class="content w-100 mw-100" id="content"><div class="loading"><div class="spinner"></div>Loading lineup…</div></main>
</div>
<script src="config.js?v=icon-font-fix-1"></script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="{{ asset('js/pages/siege.js') }}?v={{ filemtime(public_path('js/pages/siege.js')) }}"></script>
@endsection

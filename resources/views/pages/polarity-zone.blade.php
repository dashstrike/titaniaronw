@extends('layouts.app')

@section('title', "Titania · Polarity Zone")

@section('body-attributes') data-view="polarity"@endsection

@push('head')
<link rel="stylesheet" href="{{ asset('css/pages/polarity-zone.css') }}?v={{ filemtime(public_path('css/pages/polarity-zone.css')) }}">
@endpush

@section('content')
<div class="page">
  <header class="viewerbar card flex-row align-items-center justify-content-between gap-3 p-3 mb-4">
    <div class="d-flex align-items-center gap-3 flex-wrap">
      <div class="mini-brand"><img class="logo" src="images/titania-logo.webp" alt="Titania guild logo"><div><b>TITANIA</b><span>Dark Lord Server</span></div></div>
      @include('partials.discord-button', ['mobile' => false])
    </div>
    <nav class="nav gap-2">
      @include('partials.theme-toggle')
      <a class="btn btn-outline-secondary" href="public/guild-league">🛡 Guild League</a>
      <a class="btn btn-outline-secondary" href="public/siege">🏰 Siege</a>
      <a class="btn btn-primary active" href="public/polarity-zone">⚡ Polarity Zone</a>
      <button class="tool-btn btn btn-outline-secondary" id="refreshBtn">↻ Refresh</button>
    </nav>
    @include('partials.discord-button', ['mobile' => true])
  </header>
  <main class="content w-100 mw-100" id="content"><div class="loading"><div class="spinner"></div>Loading lineup…</div></main>
</div>
<script src="config.js?v=icon-font-fix-1"></script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="{{ asset('js/pages/polarity-zone.js') }}?v={{ filemtime(public_path('js/pages/polarity-zone.js')) }}"></script>
@endsection

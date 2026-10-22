@extends('layouts.app')

@section('title', "Titania · Previous Guild Runs")

@section('body-attributes') data-guild-runs-page="history"@endsection

@push('head')
<link rel="stylesheet" href="./css/guild-runs.css?v=clean-routes-1">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="./js/config.js?v=icon-font-fix-1"></script>
  <script src="{{ asset('js/guild-runs.js') }}?v={{ filemtime(public_path('js/guild-runs.js')) }}" defer></script>
@endpush

@section('content')


  <main class="wrap col-12 w-100">
    <section class="page-head">
      <div><h1>Previous Runs</h1><p>Ended Time Echo, Mirage, and Calamity Zone runs with their final registrations and carry status.</p></div>
    </section>

    <div id="pageError" class="error" hidden></div>
    <div id="loading" class="loading">Loading previous Guild Runs…</div>

    <section id="runsPanel" hidden>
      <div id="runCount" class="text-muted mb-3"></div>
      <div id="runsList" class="runs-list"></div>
    </section>
  </main>
@endsection

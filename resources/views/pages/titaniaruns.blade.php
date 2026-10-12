@extends('layouts.app')

@section('title', "Titania · Guild Runs")

@section('body-attributes') data-guild-runs-page="public"@endsection

@push('head')
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet">
  <link rel="stylesheet" href="./css/guild-runs.css?v=clean-routes-1">
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="./js/config.js?v=icon-font-fix-1"></script>
  <script src="./js/titania-runs-public.js?v=select2-theme-1" defer></script>
@endpush

@section('content')
<header class="card d-flex flex-row align-items-center justify-content-between gap-3 p-3 mb-4">
    <div class="brand">
      <img src="images/titania-logo.webp" alt="Titania">
      <div><b>TITANIA GUILD RUNS</b><span>Register for an available carry run</span></div>
    </div>
    @include('partials.theme-toggle')
  </header>

  <main class="wrap w-100 mw-100">
    <div id="pageError" class="error" hidden></div>
    <div id="loading" class="loading">Loading available runs…</div>

    <div id="publicRunsList" class="runs-list"></div>
  </main>
@endsection

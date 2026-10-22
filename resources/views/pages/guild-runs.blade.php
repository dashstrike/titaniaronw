@extends('layouts.app')

@section('title', "Titania · Guild Runs")

@section('body-attributes') data-guild-runs-page="organizer"@endsection

@push('head')
<link rel="stylesheet" href="./css/guild-runs.css?v=clean-routes-1">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="./js/config.js?v=icon-font-fix-1"></script>
  <script src="{{ asset('js/guild-runs.js') }}?v={{ filemtime(public_path('js/guild-runs.js')) }}" defer></script>
@endpush

@section('content')


  <main class="wrap col-12 w-100">
    <section class="page-head d-flex flex-nowrap align-items-start justify-content-between gap-3">
      <div><h1>Guild Runs</h1><p>Create Time Echo, Mirage, or Calamity Zone runs and view registrations.</p></div>
      <a class="btn btn-outline-secondary flex-shrink-0" href="{{ route('guild-runs-history') }}">Previous Runs</a>
    </section>

    <div id="pageError" class="error" hidden></div>
    <div id="loading" class="loading">Loading Guild Runs…</div>

    <section id="createPanel" class="panel card" hidden>
      <h2>Create Run</h2>
      <form id="createRunForm" class="create-grid">
        <label>Title<input id="runNote" type="text" maxlength="200" placeholder="Run title" class="form-control"></label>
        <label>Run Type
          <select id="runType" required class="form-select">
            <option value="time_echo">Time Echo</option>
            <option value="mirage">Mirage</option>
            <option value="calamity_zone">Calamity Zone</option>
          </select>
        </label>
        <label>Date<input id="runDate" type="date" required class="form-control"></label>
        <label>Time<input id="runTime" type="time" class="form-control"></label>
        <button class="btn primary btn-primary" type="submit">Create Run</button>
      </form>
    </section>

    <section id="runsPanel" hidden>
      <div id="runCount" class="text-muted mb-3"></div>
      <div id="runsList" class="runs-list"></div>
    </section>
  </main>
@endsection

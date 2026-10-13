@extends('layouts.app')

@section('title', "Titania · Member Profile")

@section('body-attributes')@endsection

@push('head')
<link rel="stylesheet" href="{{ asset('css/member-page.css') }}?v={{ filemtime(public_path('css/member-page.css')) }}">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="{{ asset('config.js') }}?v={{ filemtime(public_path('config.js')) }}"></script>
  <script src="./js/member-attendance.js?v=clean-routes-1"></script>
@endpush

@section('content')
<div class="mb-3">
    <a class="btn btn-outline-secondary btn-sm" href="{{ route('planner.manage_members') }}">← Back</a>
  </div>
  <main class="wrap">
    <div class="loading" id="loading">Loading member profile…</div>
    <div class="error" id="error" hidden><b>Could not load member</b><span id="errorText"></span></div>
    <div class="profile" id="profile">
      <section class="hero">
        <div class="identity"><span class="class-orb" id="classOrb"></span><div><h1 id="memberName"></h1><div class="subtitle" id="memberClass"></div><span class="status" id="memberStatus"></span></div></div>
        <div class="hero-gr"><span>Current Gear Rating</span><strong id="currentGr">0</strong></div>
      </section>
      <section class="metrics">
        <div class="metric card"><header class="card-head"><h2><i class="fa-solid fa-arrow-trend-up mr-2" aria-hidden="true"></i>7 Day Gain</h2><p>Gear Rating growth</p></header><strong id="gain7">&#8212;</strong></div>
        <div class="metric card"><header class="card-head"><h2><i class="fa-solid fa-calendar-days mr-2" aria-hidden="true"></i>30 Day Gain</h2><p>Gear Rating growth</p></header><strong id="gain30">&#8212;</strong></div>
        <div class="metric card"><header class="card-head"><h2><i class="fa-solid fa-chart-line mr-2" aria-hidden="true"></i>Total Tracked Gain</h2><p>Since the first recorded GR</p></header><strong id="gainTotal">&#8212;</strong></div>
        <div class="metric card"><header class="card-head"><h2><i class="fa-solid fa-clock-rotate-left mr-2" aria-hidden="true"></i>Tracking Since</h2><p>First recorded Gear Rating</p></header><strong id="trackingSince">&#8212;</strong></div>
      </section>
      <div class="member-card-grid" id="memberCardGrid">
        <section class="panel member-progress card"><header class="card-head"><h2><i class="fa-solid fa-chart-line mr-2" aria-hidden="true"></i>Gear Rating Progress</h2><p>Recorded growth over time</p></header><div class="chart-wrap" id="chartWrap"></div></section>
        <section class="panel member-info card"><header class="card-head"><h2><i class="fa-solid fa-id-card mr-2" aria-hidden="true"></i>Member Info</h2><p>Current assignments and roster details</p></header><div class="info-list" id="memberInfo"></div></section>
        <section class="panel member-attendance card" id="memberAttendance" aria-labelledby="memberAttendanceTitle">
          <div class="att-card-head"><header class="card-head"><h2 id="memberAttendanceTitle"><i class="fa-solid fa-chart-column mr-2" aria-hidden="true"></i>Attendance Overview</h2><p>This member across the latest 12 Guild League &amp; Siege events</p></header>
            <div class="att-controls flex-nowrap"><select id="memberAttendanceMode" aria-label="Member attendance chart view" class="form-select w-auto flex-grow-1"><option value="actual">Actual attendance</option><option value="pre">Pre-attendance</option></select><button type="button" class="btn btn-outline-secondary flex-shrink-0" id="memberAttendanceRefresh" title="Refresh" aria-label="Refresh"><i class="fa-solid fa-rotate" aria-hidden="true"></i></button></div>
          </div><div id="memberAttendanceContent"></div>
        </section>
        <section class="panel name-history-panel card" id="nameHistoryPanel"><header class="card-head"><h2><i class="fa-solid fa-signature mr-2" aria-hidden="true"></i>Name History</h2><p>Recorded character name changes</p></header><div id="nameHistoryWrap" class="muted">Loading name history...</div></section>
        <section class="panel class-history-panel card" id="classHistoryPanel"><header class="card-head"><h2><i class="fa-solid fa-user-clock mr-2" aria-hidden="true"></i>Class History</h2><p>Recorded job and class changes</p></header><div id="classHistoryWrap" class="muted">Loading class history...</div></section>
        <section class="panel history card"><header class="card-head"><h2><i class="fa-solid fa-clock-rotate-left mr-2" aria-hidden="true"></i>GR History</h2><p>Gear Rating changes, newest first</p></header><div id="historyWrap"></div></section>
      </div>
    </div>
  </main>
<script src="{{ asset('js/pages/member.js') }}?v={{ filemtime(public_path('js/pages/member.js')) }}"></script>
@endsection

@extends('layouts.app')

@section('title', "Titania · Member CSV Preview")

@section('body-attributes')@endsection

@push('head')
<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
  <link rel="stylesheet" href="{{ asset('css/pages/member-import-preview.css') }}?v={{ filemtime(public_path('css/pages/member-import-preview.css')) }}">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="./js/config.js?v=icon-font-fix-1"></script>
@endpush

@section('content')
<header class="topbar">
    <div class="brand"><img src="images/favicon-192.png" alt=""><div><h1>Titania Guild Management Tool</h1><p>Member CSV Review</p></div></div>
    <div class="actions"><a class="btn btn-outline-secondary" href="./members"><i class="fa-solid fa-arrow-left mr-2" aria-hidden="true"></i>Back to Members</a><button class="btn btn-outline-secondary" id="replaceFileBtn" type="button"><i class="fa-solid fa-file-arrow-up mr-2" aria-hidden="true"></i>Choose Different CSV</button><input id="replaceFileInput" type="file" accept=".csv,text/csv" hidden></div>
  </header>
  <main>
    <div class="page-head"><div><h2><i class="fa-solid fa-list-check mr-2" aria-hidden="true"></i>Review Member Update</h2><p>CSV-only players are added as new members. Current active members missing from the CSV will be marked inactive.</p></div><div class="file-meta" id="fileMeta"></div></div>
    <div class="summary-grid" id="summaryGrid" hidden>
      <div class="summary-card card"><span>CSV Players</span><strong id="sumRows">0</strong></div>
      <div class="summary-card good card"><span>Matched</span><strong id="sumMatched">0</strong></div>
      <div class="summary-card new card"><span>New Members</span><strong id="sumNew">0</strong></div>
      <div class="summary-card bad card"><span>Going Inactive</span><strong id="sumInactive">0</strong></div>
      <div class="summary-card warn card"><span>Need Review</span><strong id="sumReview">0</strong></div>
      <div class="summary-card card"><span>Class Changes</span><strong id="sumClass">0</strong></div>
      <div class="summary-card card"><span>GR Changes</span><strong id="sumGr">0</strong></div>
    </div>
    <div class="toolbar" id="toolbar" hidden><div class="filters" id="filters"><button class="filter-btn active btn btn-outline-primary btn-sm" data-filter="all">All</button><button class="filter-btn btn btn-outline-primary btn-sm" data-filter="review">Need Review</button><button class="filter-btn btn btn-outline-primary btn-sm" data-filter="new">New Members</button><button class="filter-btn btn btn-outline-primary btn-sm" data-filter="mapping">Name Mapping</button><button class="filter-btn btn btn-outline-primary btn-sm" data-filter="class">Class Changes</button><button class="filter-btn btn btn-outline-primary btn-sm" data-filter="gr">GR Changes</button></div><div class="toolbar-note" id="toolbarNote"></div></div>
    <div class="inactive-preview" id="inactivePreview" hidden></div>
    <div id="state" class="state">Loading CSV preview...</div>
    <div class="table-wrap table-responsive" id="tableWrap" hidden><table><thead><tr><th>CSV Player</th><th>Titania Member</th><th>Match</th><th>Class</th><th>Gear Score</th><th>Title</th><th>This Week Activity</th><th>Weekly Contribution</th><th>Total Contribution</th><th>Action</th></tr></thead><tbody id="rowsBody"></tbody></table></div>
    <div class="footer-bar" id="footerBar" hidden><div class="footer-msg" id="footerMsg"></div><div class="footer-actions"><a class="btn btn-outline-secondary" href="./members">Cancel</a><button class="btn primary btn-primary" id="applyBtn" type="button" disabled><i class="fa-solid fa-cloud-arrow-up mr-2" aria-hidden="true"></i>Apply Updates</button></div></div>
  </main>
  <script src="{{ asset('js/member-import-preview.js') }}?v={{ filemtime(public_path('js/member-import-preview.js')) }}"></script>
@endsection

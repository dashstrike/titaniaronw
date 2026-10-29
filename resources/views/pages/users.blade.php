@extends('layouts.app')

@section('title', "Titania · User Management")

@section('body-attributes')@endsection

@push('head')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <link rel="stylesheet" href="./css/user-management.css?v=clean-routes-1">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="./js/config.js?v=icon-font-fix-1"></script>
  <script src="{{ asset('js/user-management.js') }}?v={{ filemtime(public_path('js/user-management.js')) }}" defer></script>
@endpush

@section('content')


  <main class="wrap col-12 w-100">
    <section class="page-head">
      <div>
        <h1>User Management</h1>
        <p>Approve registrations and manage Titania access roles.</p>
      </div>
      <div class="d-flex align-items-center gap-2"><div class="user-count" id="userCount">— users</div><button class="btn btn-outline-secondary" id="refreshBtn" type="button"><i class="fa-solid fa-rotate mr-2" aria-hidden="true"></i>Refresh</button></div>
    </section>

    <div class="notice">
      <b>Admin</b>: full access · <b>Party Organizer</b>: roster, lineups, Star Dungeon and attendance · <b>Attendance Auditor</b>: attendance and pre-attendance only · <b>Viewer</b>: read-only · <b>Pending</b>: awaiting approval. Admins can permanently delete unnecessary accounts; your own account is protected.
    </div>

    <section class="panel card">
      <div class="loading" id="loading">Loading users…</div>
      <div class="error" id="error" hidden></div>
      <div class="table-responsive" id="usersList" hidden></div>
    </section>
    <section id="loginHistoryPanel" class="card mt-3" hidden>
      <div class="card-header d-flex justify-content-between align-items-center gap-2"><div><h2 class="h5 mb-1">Login History</h2><p class="text-muted mb-0">Only visible to you. Latest login per user, with confirmed sign-out time.</p></div><button type="button" id="loginHistoryRefresh" class="btn btn-outline-secondary d-inline-flex align-items-center"><i class="fa-solid fa-rotate me-2" aria-hidden="true"></i>Refresh</button></div>
      <div class="card-body">
        <div id="loginHistoryList" class="table-responsive">Loading login history…</div>
        <p class="text-muted small mt-2 mb-0">A dash means no sign-out was recorded. Closing a tab does not count as logging out.</p>
      </div>
    </section>
  </main>
@endsection

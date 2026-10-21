@extends('layouts.app')

@section('title', "Titania Guild Management Tool")

@section('body-attributes')@endsection

@push('head')
<link rel="preconnect" href="https://fonts.googleapis.com">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
  <link rel="stylesheet" href="{{ asset('css/pages/index.css') }}?v={{ filemtime(public_path('css/pages/index.css')) }}">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
  <script src="{{ asset('config.js') }}?v={{ filemtime(public_path('config.js')) }}"></script>
@endpush

@section('content')
<div class="auth-screen" id="authScreen" hidden>
    <div class="auth-shell">
      <div class="auth-brand"><img class="auth-logo" src="images/titania-logo.webp" alt="Titania guild logo"><h1>TITANIA</h1><p>Guild Management Tool · Dark Lord Server</p></div>
      <div class="auth-card card">
        <div class="auth-tabs" id="authTabs">
          <button class="auth-tab active btn btn-outline-primary" type="button" data-auth-view="login">Sign In</button>
          <button class="auth-tab btn btn-outline-primary" type="button" data-auth-view="register">Register</button>
        </div>
        <div class="auth-panel" id="authLoginPanel">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-copy">Sign in with your Titania account.</p>
          <div class="auth-field"><label for="authLoginEmail">Email</label><input id="authLoginEmail" type="email" autocomplete="email" class="form-control"></div>
          <div class="auth-field"><label for="authLoginPassword">Password</label><input id="authLoginPassword" type="password" autocomplete="current-password" class="form-control"></div>
          <button class="btn primary btn-primary" id="authLoginBtn" type="button">Sign In</button>
          <div class="auth-row"><button class="auth-link" id="authForgotBtn" type="button">Forgot password?</button></div>
          <div class="auth-message" id="authLoginMessage"></div>
        </div>
        <div class="auth-panel" id="authRegisterPanel" hidden>
          <h2 class="auth-title">Create account</h2>
          <p class="auth-copy">New accounts start as pending. An admin must approve access.</p>
          <div class="auth-field"><label for="authRegisterName">Display name</label><input id="authRegisterName" maxlength="120" autocomplete="nickname" class="form-control"></div>
          <div class="auth-field"><label for="authRegisterEmail">Email</label><input id="authRegisterEmail" type="email" autocomplete="email" class="form-control"></div>
          <div class="auth-field"><label for="authRegisterPassword">Password</label><input id="authRegisterPassword" type="password" minlength="8" autocomplete="new-password" class="form-control"></div>
          <button class="btn primary btn-primary" id="authRegisterBtn" type="button">Register</button>
          <div class="auth-message" id="authRegisterMessage"></div>
        </div>
        <div class="auth-panel" id="authPendingPanel" hidden>
          <h2 class="auth-title">Waiting for approval</h2>
          <div class="pending-box" id="authPendingText">Your account has been created, but an administrator still needs to approve it.</div>
          <button class="btn primary btn-primary" id="authCheckApprovalBtn" type="button">Check Approval</button>
          <button class="btn btn-outline-secondary" id="authPendingLogoutBtn" type="button">Sign Out</button>
          <div class="auth-message" id="authPendingMessage"></div>
        </div>
        <div class="auth-panel" id="authResetPanel" hidden>
          <h2 class="auth-title">Set new password</h2>
          <p class="auth-copy">Enter a new password for your Titania account.</p>
          <div class="auth-field"><label for="authResetPassword">New password</label><input id="authResetPassword" type="password" minlength="8" autocomplete="new-password" class="form-control"></div>
          <div class="auth-field"><label for="authResetPassword2">Confirm password</label><input id="authResetPassword2" type="password" minlength="8" autocomplete="new-password" class="form-control"></div>
          <button class="btn primary btn-primary" id="authResetBtn" type="button">Update Password</button>
          <div class="auth-message" id="authResetMessage"></div>
        </div>
        <div class="auth-panel" id="authConfigPanel" hidden>
          <h2 class="auth-title">Supabase setup required</h2>
          <div class="pending-box">Open <b>config.js</b> and paste your Supabase Project URL and <b>Publishable key</b>. Never put a service-role or secret key in the website.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="loading-overlay" id="loadingOverlay">
    <div class="loader"></div>
    <div class="loading-text" id="loadingText">Loading Titania planner…</div>
  </div>
  <input id="importFileInput" type="file" accept="application/json,.json" hidden>

  <div class="overlay" id="memberModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="memberModalTitle">
      <div class="modal-head">
        <h3 id="memberModalTitle">Add member</h3>
        <button class="icon-btn btn btn-outline-secondary btn-sm" id="memberModalClose" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field full"><label for="memberNameInput">Member name</label><input id="memberNameInput" maxlength="120" autocomplete="off" class="form-control"></div>
          <div class="form-field"><label for="memberClassInput">Class</label><select id="memberClassInput" class="form-select"></select></div>
          <div class="form-field"><label for="memberGrInput">Gear rating</label><input id="memberGrInput" type="number" min="0" max="999999999" step="1" class="form-control"></div>
          <div class="form-field full"><label for="memberNationalityInput">Nationality</label><select id="memberNationalityInput" class="form-select"><option value=""></option><option value="malaysia">Malaysia</option><option value="indonesia">Indonesia</option><option value="thailand">Thailand</option><option value="philippines">Philippines</option></select></div>
          <div class="form-field full"><label for="memberNotesInput">Notes</label><textarea id="memberNotesInput" maxlength="500" class="form-control"></textarea></div>
        </div>
        <div class="guide-note member-status-notice" id="memberStatusNotice" hidden></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline-secondary" id="memberModalCancel">Cancel</button>
        <button class="btn primary btn-primary" id="memberModalSave">Save member</button>
      </div>
    </div>
  </div>

  <div class="overlay" id="statusModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="statusModalTitle">
      <div class="modal-head">
        <h3 id="statusModalTitle">Mark member inactive</h3>
        <button class="icon-btn btn btn-outline-secondary btn-sm" id="statusModalClose" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="status-member-summary" id="statusMemberSummary"></div>
        <div class="form-grid">
          <div class="form-field full"><label for="statusDateInput" id="statusDateLabel">Inactive since</label><input id="statusDateInput" type="date" class="form-control"></div>
          <div class="form-field full"><label for="statusReasonInput">Reason</label><select id="statusReasonInput" class="form-select"></select></div>
          <div class="form-field full" id="statusOtherReasonField" hidden><label for="statusOtherReasonInput">Other reason</label><input id="statusOtherReasonInput" maxlength="300" autocomplete="off" class="form-control"></div>
        </div>
        <div class="status-impact" id="statusImpactText"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline-secondary" id="statusModalCancel">Cancel</button>
        <button class="btn primary btn-primary" id="statusModalSave">Mark Inactive</button>
      </div>
    </div>
  </div>


  <div class="overlay" id="adminUsersModal" hidden>
    <div class="modal" style="width:min(880px,100%)" role="dialog" aria-modal="true" aria-labelledby="adminUsersTitle">
      <div class="modal-head"><h3 id="adminUsersTitle">User Access</h3><button class="icon-btn btn btn-outline-secondary btn-sm" id="adminUsersClose" aria-label="Close">✕</button></div>
      <div class="modal-body">
        <div class="guide-note" style="margin-bottom:12px">New registrations are <b>Pending</b>. Approve them as Viewer or Leader. Only Admins can manage accounts.</div>
        <div class="admin-users-list" id="adminUsersList"><div class="empty-note">Loading users…</div></div>
      </div>
      <div class="modal-foot"><button class="btn btn-outline-secondary" id="adminUsersRefresh">Refresh</button><button class="btn primary btn-primary" id="adminUsersDone">Done</button></div>
    </div>
  </div>

  <div class="print-overlay" id="printOverlay" hidden>
    <div class="print-shell">
      <div class="print-toolbar"><h3>🖨 Print / Share View</h3><div class="actions"><button class="btn primary small btn-primary btn-sm" id="printNowBtn">🖨 Print / Save as PDF</button><button class="btn small btn-outline-secondary btn-sm" id="printCloseBtn">✕ Close</button></div></div>
      <div class="print-content" id="printContent"></div>
    </div>
  </div>

  <div class="app" id="app" hidden>
    <div class="app-inner">
      <!-- Hidden event hooks are shared by the sidebar and attendance modules. -->
      <nav class="event-tabs" id="eventTabs" aria-label="Planner modes" hidden>
          <button class="event-tab" data-event="dashboard">📊 Dashboard</button>
          <button class="event-tab" data-event="manage_members">🛠 Members</button>
          <button class="event-tab" data-event="guild_league">🛡️ Guild League</button>
          <button class="event-tab" data-event="siege">🏰 Siege</button>
          <button class="event-tab" data-event="polarity_zone">⚡ Polarity Zone</button>
        </nav>

          <div class="event-action-row" id="eventActionRow" hidden>
            <button class="btn btn-outline-secondary" id="poolToggleBtn" type="button" aria-controls="sidebar" aria-expanded="true" title="Hide Member/Party Pool"><i class="fa-solid fa-angles-left" id="poolToggleIcon" aria-hidden="true"></i><span id="poolToggleText">Hide Pool</span></button>
            <button class="btn public-toggle off btn-outline-secondary" id="publicToggleBtn" type="button" title="Publish or hide this event on the public lineup page"><span class="publish-switch" aria-hidden="true"></span><span id="publicToggleText">Public View: OFF</span></button>
            <button class="btn btn-outline-secondary" id="autoFillBtn" type="button">Auto-fill</button>
            <button class="btn btn-outline-secondary" id="printBtn">🖨 Print/Share</button>
            <button class="btn btn-outline-secondary" id="exportBtn">⬇ Export</button>
            <button class="btn btn-outline-secondary" id="importBtn">⬆ Import</button>
            <button class="btn danger btn-outline-danger" id="clearBtn">Clear all</button>
            <span class="event-last-updated" id="eventLastUpdated"><span class="event-last-updated-label">Last update</span><span class="event-last-updated-value">—</span></span>
          </div>

      <div class="body-wrap" id="bodyWrap">
        <aside class="sidebar card" id="sidebar">
          <div class="sidebar-head">
            <div class="sidebar-title-row"><h2>Member Pool</h2><button class="btn primary small btn-primary btn-sm" id="addMemberBtn">+ Add</button></div>
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
              <input id="memberSearch" type="search" placeholder="Search member…" autocomplete="off" class="form-control">
            </div>
            <div class="filter-row" id="filterRow"></div>
            <select class="class-select form-select" id="classFilter"><option value="All">All Classes</option></select>
            <div class="sort-row" id="sortRow"></div>
          </div>
          <div class="member-list" id="memberList"></div>
          <div class="class-breakdown" id="classBreakdown"></div>
        </aside>
        <main class="main">
          <div id="teamsWrap"></div>
        </main>
      </div>
    </div>
  </div>

<script src="{{ asset('js/pages/index.js') }}?v={{ filemtime(public_path('js/pages/index.js')) }}"></script>
@endsection

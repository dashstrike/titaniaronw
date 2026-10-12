@extends('layouts.app')

@section('title', "Titania · Party Management")

@section('body-attributes')@endsection

@push('head')
<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
  <link rel="stylesheet" href="{{ asset('css/pages/parties.css') }}?v={{ filemtime(public_path('css/pages/parties.css')) }}">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
  <script src="./js/config.js"></script>
@endpush

@section('content')

  <main class="col-12 mw-100 px-0">
    <div class="page-head"><div><h2><i class="fa-solid fa-people-group mr-2" aria-hidden="true"></i>Party Management</h2><p>30 reusable reference parties · 5 members each</p></div><div class="summary" id="summary">Loading…</div></div>
    <div class="notice">Search members by name or class. These are reusable party templates; drag a complete party from <b>Party Pool</b> onto Guild League or Siege to place all 5 members.</div>
    <div id="state" class="state">Loading parties…</div>
    <div id="partyGrid" class="party-grid" hidden></div>
  </main>
  <script src="{{ asset('js/party-manager.js') }}?v={{ filemtime(public_path('js/party-manager.js')) }}"></script>
@endsection

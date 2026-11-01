@extends('layouts.app')

@section('title', "Titania · Party Management")

@section('body-attributes')@endsection

@push('head')
  <link rel="stylesheet" href="{{ asset('css/pages/parties.css') }}?v={{ filemtime(public_path('css/pages/parties.css')) }}">



  <script src="./js/config.js"></script>
@endpush

@section('content')

  <main class="col-12 mw-100 px-0">
    <div class="page-head"><div><h2><i class="fa-solid fa-people-group mr-2" aria-hidden="true"></i>Party Management</h2><p>30 reusable reference parties · 5 members each</p></div><div class="summary" id="summary">Loading…</div></div>
    <div class="notice">Search members by name or class. Names, classes, and job icons follow saved Members updates automatically. Inactive members are removed from parties. These are reusable party templates; drag a complete party from <b>Party Pool</b> onto Guild League or Siege to place all 5 members.</div>
    <div id="state" class="state">Loading parties…</div>
    <div id="partyGrid" class="party-grid" hidden></div>
  </main>
  <script src="{{ asset('js/party-manager.js') }}?v={{ filemtime(public_path('js/party-manager.js')) }}"></script>
@endsection

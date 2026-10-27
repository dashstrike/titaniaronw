@extends('layouts.app')

@section('title', 'Titania · Guild League Data')

@push('head')
<link rel="stylesheet" href="{{ asset('vendor/datatables/dataTables.bootstrap5.min.css') }}">
<script src="{{ asset('vendor/datatables/jquery.min.js') }}" defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js" defer></script>
<script src="{{ asset('vendor/datatables/dataTables.min.js') }}" defer></script>
<script src="{{ asset('vendor/datatables/dataTables.bootstrap5.min.js') }}" defer></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="{{ asset('js/config.js') }}"></script>
<script src="{{ asset('js/pvp-data.js') }}?v={{ filemtime(public_path('js/pvp-data.js')) }}" defer></script>
@endpush

@section('content')
<main id="pvpData">
    <h1 class="h3">Guild League Data</h1>
    <p class="text-muted">Battle history and player statistics for both guilds.</p>
    <div id="pvpStatus" class="alert alert-info" role="status">Loading battle data…</div>
    <div class="card" id="pvpImportPanel" hidden>
        <div class="card-header"><h2 class="h5 mb-1">Import Battle</h2><p class="text-muted mb-0">Import one CSV per battlefield. All guilds and player statistics are preserved.</p></div>
        <div class="card-body">
            <form id="pvpImportForm">
                <fieldset id="pvpImportFields" disabled>
                    <div class="row g-3 align-items-end">
                        <div class="col-12 col-md-3"><label for="pvpImportDate" class="form-label">Battle date (GMT+8)</label><input type="text" class="form-control" id="pvpImportDate" placeholder="Select battle date" required></div>
                        <div class="col-12 col-md-2"><label for="pvpImportTime" class="form-label">GL Session (GMT+8)</label><select class="form-select" id="pvpImportTime" required><option value="">Select battle date first</option></select></div>
                        <div class="col-12 col-md-2"><label for="pvpImportField" class="form-label">Battlefield</label><select class="form-select" id="pvpImportField"><option value="main">Main Battlefield</option><option value="sub">Sub Battlefield</option></select></div>
                        <div class="col-12 col-md-3"><label for="pvpFile" class="form-label">CSV file</label><input type="file" class="form-control" id="pvpFile" accept=".csv,text/csv" required></div>
                        <div class="col-12 col-md-2"><button class="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center" type="submit"><i class="fa-solid fa-file-import me-2" aria-hidden="true"></i>Import</button></div>
                    </div>
                </fieldset>
            </form>
        </div>
    </div>
    <div class="card" id="pvpResults" hidden>
        <div class="card-header d-flex align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-1">Battle Statistics</h2><p id="pvpSummary" class="text-muted mb-0"></p></div><button class="btn btn-outline-secondary d-inline-flex align-items-center" id="pvpRefresh" type="button"><i class="fa-solid fa-arrows-rotate me-2" aria-hidden="true"></i>Refresh</button></div>
        <div class="card-body">
            <div class="row g-3 mb-3">
                <div class="col-12 col-md-3"><label class="form-label" for="pvpViewDate">Battle date</label><input class="form-control" type="text" id="pvpViewDate" placeholder="Select battle date"><small class="text-muted">Purple dot: battle data available.</small></div>
                <div class="col-12 col-md-3"><label class="form-label" for="pvpViewSession">GL Session (GMT+8)</label><select class="form-select" id="pvpViewSession"></select></div>
                <div class="col-12 col-md-3"><label class="form-label" for="pvpViewField">Battlefield</label><select class="form-select" id="pvpViewField"></select></div>
                <div class="col-12 col-md-3"><label class="form-label" for="pvpJob">Job</label><select class="form-select" id="pvpJob"><option value="">All jobs</option></select></div>
            </div>
            <ul class="nav nav-underline nav-justified border-bottom mb-3" id="pvpGuildTabs" role="tablist" aria-label="Battle guilds"></ul>
            <div class="tab-content" id="pvpTable"></div>
        </div>
    </div>
</main>
@endsection

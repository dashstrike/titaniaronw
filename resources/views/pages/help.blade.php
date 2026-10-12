@extends('layouts.app')

@section('title', 'Titania · Help')

@push('head')
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="{{ asset('js/config.js') }}"></script>
@endpush

@section('content')
<div class="col-12">
    <div class="card">
        <div class="card-header"><h1 class="card-title mb-0">How this Titania website works</h1></div>
        <div class="card-body">
            <ol class="mb-4">
                <li class="mb-3"><b>Dashboard</b> — review guild statistics, class balance, Gear Rating distribution, top members, and recent membership history. Use the <b>Members</b> tab for roster changes.</li>
                <li class="mb-3"><b>Members</b> — add or edit members, change class and Gear Rating, mark members inactive when they leave, and reactivate them when they return. Changes autosave to Supabase.</li>
                <li class="mb-3"><b>Guild League & Siege</b> — drag a member onto a slot. Drag one filled slot onto another to swap. On any device, tap/click a member or filled slot, then tap another slot to place or swap. Use the slot Remove button to remove a member.</li>
                <li class="mb-3"><b>Siege Parties</b> — drag the ⠿ handle on a Party into another Raid. Each Raid must keep at least 1 Party and can hold up to 5.</li>
                <li class="mb-3"><b>Attendance</b> — open or create an event, mark actual attendance, use <b>Refresh Members</b> to reload the latest active roster and party list, then finish attendance when complete.</li>
                <li class="mb-3"><b>Runs</b> — create Time Echo or Mirage runs, open or close registration, review registered players, update status, and end or delete runs.</li>
                <li class="mb-3"><b>People leaving or returning</b> — use <b>Mark Inactive</b> instead of deleting a member. Inactive members leave current teams and disappear from the Member Pool. Reactivate them from Dashboard when they return.</li>
                <li class="mb-3"><b>Polarity Zone</b> — STAR and Normal Dungeon are grouped into raid rows. Moving a team from STAR copies it; moving a Normal Dungeon team moves it.</li>
                <li class="mb-3"><b>Website access</b> — Admin has full access. Party Organizer manages lineups and attendance. Attendance Auditor manages attendance only. Viewer is read-only.</li>
            </ol>
            <div class="alert alert-info mb-0">
Use <b>Print/Share</b> for a clean lineup summary. Export/import contains the full roster, Guild Status, membership history, Guild League, Siege, Polarity Zone, and finished-dungeon marks.
</div>
        </div>
    </div>
</div>
@endsection

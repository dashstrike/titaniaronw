@if(config('titania.auction_workflow'))
@if($organizer)
<form id="{{ $prefix }}BanForm" class="card p-3 mb-3" hidden>
    <fieldset id="{{ $prefix }}BanFields" disabled>
        <div class="row g-3 align-items-end">
            <div class="col-12 col-xl-4">
                <label for="{{ $prefix }}BanPlayer" class="form-label">Ban player from all auctions</label>
                <select id="{{ $prefix }}BanPlayer" class="form-select" required><option value="">Select IGN</option></select>
            </div>
            <div class="col-12 col-xl-5">
                <label for="{{ $prefix }}BanUntil" class="form-label">Ban until (GMT+8)</label>
                <input type="text" id="{{ $prefix }}BanUntil" class="form-control" placeholder="Select date and time" autocomplete="off">
            </div>
            <div class="col-12 col-xl-3">
                <button type="submit" id="{{ $prefix }}BanSubmit" class="btn btn-danger w-100 d-inline-flex align-items-center justify-content-center"><i class="fa-solid fa-ban me-2" aria-hidden="true"></i>Ban</button>
            </div>
        </div>
    </fieldset>
</form>
@endif
@if($organizer)
<div class="d-flex justify-content-end mb-3">
    <button type="button" id="{{ $prefix }}ActionHistory" class="btn btn-outline-secondary d-inline-flex align-items-center" hidden><i class="fa-solid fa-clock-rotate-left me-2" aria-hidden="true"></i>Action History</button>
</div>
@endif
@endif

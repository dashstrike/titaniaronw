<div id="glRosterSearch" class="position-fixed bottom-0 end-0 p-3" data-public-search="{{ ($publicSearch ?? false) ? 'true' : 'false' }}" hidden>
    <div id="glRosterSearchPanel" class="d-flex align-items-center rounded-pill" role="search" aria-label="{{ $searchLabel ?? 'Find Player' }}">
        <iconify-icon icon="bx:search" class="fs-20 me-2 flex-shrink-0" aria-hidden="true"></iconify-icon>
        <label for="glRosterSearchInput" class="visually-hidden">{{ $searchLabel ?? 'Find Player' }}</label>
        <input id="glRosterSearchInput" type="search" class="form-control flex-grow-1" placeholder="{{ $searchLabel ?? 'Find Player' }}" autocomplete="off" aria-describedby="glRosterSearchCount">
        <span id="glRosterSearchControls" class="d-inline-flex align-items-center ms-2 flex-shrink-0" hidden>
            <small id="glRosterSearchCount" class="text-nowrap me-2" role="status" aria-live="polite"></small>
            <button id="glRosterSearchPrevious" type="button" class="btn btn-sm border-0 bg-transparent text-white p-1 d-inline-flex align-items-center justify-content-center" aria-label="Previous matching player" disabled><iconify-icon icon="bx:chevron-up" class="fs-20" aria-hidden="true"></iconify-icon></button>
            <button id="glRosterSearchNext" type="button" class="btn btn-sm border-0 bg-transparent text-white p-1 d-inline-flex align-items-center justify-content-center" aria-label="Next matching player" disabled><iconify-icon icon="bx:chevron-down" class="fs-20" aria-hidden="true"></iconify-icon></button>
        </span>
    </div>
</div>

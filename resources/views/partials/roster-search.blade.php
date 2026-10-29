<div id="glRosterSearch" class="position-fixed bottom-0 end-0 p-3" data-public-search="{{ ($publicSearch ?? false) ? 'true' : 'false' }}" hidden>
    <section id="glRosterSearchPanel" class="card mb-2" aria-labelledby="glRosterSearchTitle" hidden>
        <div class="card-header d-flex align-items-center justify-content-between gap-2 py-2">
            <h2 id="glRosterSearchTitle" class="h6 mb-0">{{ $searchLabel ?? 'Find Player' }}</h2>
            <button id="glRosterSearchClose" type="button" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center" aria-label="Close player search"><iconify-icon icon="bx:x" aria-hidden="true"></iconify-icon></button>
        </div>
        <div class="card-body p-3">
            <label for="glRosterSearchInput" class="visually-hidden">Player name</label>
            <input id="glRosterSearchInput" type="search" class="form-control mb-2" placeholder="Search player name…" autocomplete="off" aria-describedby="glRosterSearchCount">
            <div class="d-flex align-items-center justify-content-between gap-2">
                <small id="glRosterSearchCount" class="text-muted" role="status" aria-live="polite">Enter a player name.</small>
                <div class="d-flex gap-2">
                    <button id="glRosterSearchPrevious" type="button" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center" aria-label="Previous matching player" disabled><iconify-icon icon="bx:chevron-up" aria-hidden="true"></iconify-icon></button>
                    <button id="glRosterSearchNext" type="button" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center" aria-label="Next matching player" disabled><iconify-icon icon="bx:chevron-down" aria-hidden="true"></iconify-icon></button>
                </div>
            </div>
        </div>
    </section>
    <div class="d-flex justify-content-end">
        <button id="glRosterSearchToggle" type="button" class="btn btn-outline-primary rounded-pill px-3 py-2 d-inline-flex align-items-center justify-content-center" aria-label="{{ $searchLabel ?? 'Find Player' }} in roster" aria-controls="glRosterSearchPanel" aria-expanded="false"><iconify-icon icon="bx:search" class="fs-20 me-2" aria-hidden="true"></iconify-icon><span>{{ $searchLabel ?? 'Find Player' }}</span></button>
    </div>
</div>

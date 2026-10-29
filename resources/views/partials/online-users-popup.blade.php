<div id="onlineUsersPopup" class="position-fixed bottom-0 start-0 p-3" hidden>
    <section id="onlineUsersPopupPanel" class="card mb-2" aria-labelledby="onlineUsersPopupTitle" hidden>
        <div class="card-header d-flex justify-content-between align-items-center gap-2 py-2">
            <h2 id="onlineUsersPopupTitle" class="h6 mb-0">Who's Online</h2>
            <button id="onlineUsersPopupClose" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center" type="button" aria-label="Close online users"><iconify-icon icon="bx:x" aria-hidden="true"></iconify-icon></button>
        </div>
        <div class="card-body p-3">
            <p class="text-muted small mb-2">Active in the last two minutes. Updates every 30 seconds. Only visible to you.</p>
            <div id="onlineUsersPopupList" aria-live="polite">Loading activity…</div>
        </div>
    </section>
    <button id="onlineUsersPopupToggle" class="btn btn-outline-primary rounded-pill px-3 py-2 d-inline-flex align-items-center justify-content-center" type="button" aria-controls="onlineUsersPopupPanel" aria-expanded="false"><iconify-icon icon="bx:group" class="fs-20 me-2" aria-hidden="true"></iconify-icon><span>Who's Online</span><span id="onlineUsersPopupCount" class="badge bg-success ms-2">0</span></button>
</div>

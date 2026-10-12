<header class="app-topbar" id="titania-topbar" @if($page === 'index') hidden @endif @if($publicPage) style="left:0" @endif>
    <div class="container-fluid">
        <div class="navbar-header">
            <div class="d-flex align-items-center gap-3">
                @unless($publicPage)
                    <div class="topbar-item">
                        <button class="button-toggle-menu topbar-button" type="button" aria-label="Toggle navigation">
                            <iconify-icon icon="solar:hamburger-menu-outline" class="fs-24 align-middle"></iconify-icon>
                        </button>
                    </div>
                @endunless
            </div>
            <div class="d-flex align-items-center gap-1 gap-sm-2">
                @if($page === 'index')
                    <span class="save-flag d-flex align-items-center gap-1 small text-muted" id="saveFlag" role="status" aria-live="polite">
                        <i class="bx bxs-circle fs-10" aria-hidden="true"></i><span id="saveFlagText">Loading</span>
                    </span>
                @endif
                <div class="topbar-item">
                    <button class="topbar-button" type="button" id="light-dark-mode" aria-label="Toggle colour theme">
                        <iconify-icon icon="solar:moon-outline" class="fs-22 align-middle light-mode"></iconify-icon>
                        <iconify-icon icon="solar:sun-2-outline" class="fs-22 align-middle dark-mode"></iconify-icon>
                    </button>
                </div>
                @unless($publicPage)
                    <div class="dropdown topbar-item" id="accountBtn" hidden>
                        <button class="topbar-button" type="button" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
                            <iconify-icon icon="solar:user-circle-outline" class="fs-32 align-middle"></iconify-icon>
                        </button>
                        <div class="dropdown-menu dropdown-menu-end" aria-labelledby="page-header-user-dropdown">
                            <h6 class="dropdown-header">Welcome!</h6>
                            <div class="px-3 pb-2">
                                <div class="fw-semibold" id="accountName">Account</div>
                                <span class="badge bg-primary-subtle text-primary" id="accountRole"></span>
                            </div>
                                <a class="dropdown-item" id="helpBtn" href="{{ route('help') }}">
                                    <iconify-icon icon="solar:help-outline" class="align-middle me-2 fs-18"></iconify-icon><span class="align-middle">Help</span>
                                </a>
                            <div class="dropdown-divider my-1"></div>
                            <button class="dropdown-item text-danger" id="logoutBtn" type="button" hidden>
                                <iconify-icon icon="solar:logout-3-outline" class="align-middle me-2 fs-18"></iconify-icon><span class="align-middle">Logout</span>
                            </button>
                        </div>
                    </div>
                @endunless
                @if($publicPage)
                    <a class="btn btn-primary btn-sm" href="{{ route('dashboard') }}">Management</a>
                @endif
            </div>
        </div>
    </div>
</header>

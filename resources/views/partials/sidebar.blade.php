<aside class="app-sidebar" id="titania-navigation" @if($page === 'index') hidden @endif>
    <div class="logo-box">
        @foreach(['light', 'dark'] as $variant)
            <a href="{{ route('dashboard') }}" class="logo-{{ $variant }}" aria-label="Titania dashboard">
                <img src="{{ asset('images/favicon-192.png') }}" class="logo-sm" alt="Titania">
                <img src="{{ asset('images/titania-logo.webp') }}" class="logo-lg" alt="Titania">
            </a>
        @endforeach
    </div>
    <div class="scrollbar" data-simplebar>
        <ul class="navbar-nav" id="navbar-nav">
            <li class="menu-title">Guild Management</li>
            @foreach([
                ['dashboard', 'Dashboard', 'bx-home-alt'],
                ['manage_members', 'Members', 'bx-group'],
                ['guild_league', 'Guild League', 'bx-shield'],
                ['siege', 'Siege', 'bx-building-house'],
                ['attendance', 'Attendance', 'bx-calendar-check'],
            ] as [$event, $label, $icon])
                <li class="nav-item">
                    <a class="nav-link" href="{{ route($event === 'dashboard' ? 'dashboard' : 'planner.'.$event) }}" data-planner-event="{{ $event }}">
                        <span class="nav-icon">@if($event === 'dashboard')<i class="fa-solid fa-chart-pie" aria-hidden="true"></i>@elseif($event === 'siege')<i class="fa-regular fa-chess-rook" aria-hidden="true"></i>@else<iconify-icon icon="bx:{{ substr($icon, 3) }}"></iconify-icon>@endif</span>
                        <span class="nav-text">{{ $label }}</span>
                    </a>
                </li>
            @endforeach
            @foreach([
                ['parties', 'Manage Parties', 'bx-grid-alt'],
                ['guild-runs', 'Guild Runs', 'bx-run'],
                ['guild-runs-history', 'Run History', 'bx-history'],
                ['auction', 'Auction', 'bx-purchase-tag'],
            ] as [$routeName, $label, $icon])
                <li class="nav-item">
                    <a class="nav-link {{ $page === $routeName ? 'active' : '' }}" href="{{ route($routeName) }}">
                        <span class="nav-icon"><iconify-icon icon="bx:{{ substr($icon, 3) }}"></iconify-icon></span>
                        <span class="nav-text">{{ $label }}</span>
                    </a>
                </li>
            @endforeach
            <li class="nav-item">
                <a class="nav-link menu-arrow {{ in_array($page, ['maps-gl', 'maps-siege'], true) ? 'active' : '' }}" href="#sidebarMaps" data-bs-toggle="collapse" role="button" aria-expanded="{{ in_array($page, ['maps-gl', 'maps-siege'], true) ? 'true' : 'false' }}" aria-controls="sidebarMaps">
                    <span class="nav-icon"><iconify-icon icon="bx:map-alt"></iconify-icon></span>
                    <span class="nav-text">Map (TESTING)</span>
                </a>
                <div class="collapse {{ in_array($page, ['maps-gl', 'maps-siege'], true) ? 'show' : '' }}" id="sidebarMaps">
                    <ul class="nav sub-navbar-nav">
                        <li class="sub-nav-item"><a class="sub-nav-link {{ $page === 'maps-gl' ? 'active' : '' }}" href="{{ route('maps-gl') }}">Guild League</a></li>
                        <li class="sub-nav-item"><a class="sub-nav-link {{ $page === 'maps-siege' ? 'active' : '' }}" href="{{ route('maps-siege') }}">Siege</a></li>
                    </ul>
                </div>
            </li>
            <li class="nav-item" id="titania-users-link" hidden>
                <a class="nav-link {{ $page === 'users' ? 'active' : '' }}" href="{{ route('users') }}">
                    <span class="nav-icon"><iconify-icon icon="bx:user-check"></iconify-icon></span>
                    <span class="nav-text">User Access</span>
                </a>
            </li>
            <li class="menu-title">Public Pages</li>
            @foreach([['guild-league', 'Guild League'], ['siege', 'Siege'], ['titaniaruns', 'Titania Runs'], ['titaniaauction', 'Auction']] as [$routeName, $label])
                <li class="nav-item">
                    <a class="nav-link" href="{{ route($routeName) }}" target="_blank" rel="noopener noreferrer">
                        <span class="nav-icon"><iconify-icon icon="bx:link-external"></iconify-icon></span>
                        <span class="nav-text">{{ $label }}</span>
                    </a>
                </li>
            @endforeach
        </ul>
    </div>
</aside>

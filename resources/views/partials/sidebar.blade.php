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
                ['dashboard', 'Dashboard', 'bx-pie-chart-alt-2'],
                ['manage_members', 'Members', 'bx-group'],
            ] as [$event, $label, $icon])
                <li class="nav-item">
                    <a class="nav-link" href="{{ route($event === 'dashboard' ? 'dashboard' : 'planner.'.$event) }}" data-planner-event="{{ $event }}">
                        <span class="nav-icon"><iconify-icon icon="bx:{{ substr($icon, 3) }}"></iconify-icon></span>
                        <span class="nav-text">{{ $label }}</span>
                    </a>
                </li>
            @endforeach
            @php($rosterActive = $page === 'parties' || ($page === 'index' && in_array($plannerEvent, ['guild_league', 'siege', 'attendance'], true)))
            <li class="nav-item">
                <a class="nav-link menu-arrow {{ $rosterActive ? 'active' : '' }}" href="#sidebarGuildRoster" data-bs-toggle="collapse" role="button" aria-expanded="{{ $rosterActive ? 'true' : 'false' }}" aria-controls="sidebarGuildRoster">
                    <span class="nav-icon"><iconify-icon icon="bx:extension"></iconify-icon></span>
                    <span class="nav-text">Guild Roster</span>
                </a>
                <div class="collapse {{ $rosterActive ? 'show' : '' }}" id="sidebarGuildRoster">
                    <ul class="nav sub-navbar-nav">
                        @foreach([['guild_league', 'Guild League'], ['siege', 'Siege']] as [$event, $label])
                            <li class="sub-nav-item"><a class="sub-nav-link" href="{{ route('planner.'.$event) }}" data-planner-event="{{ $event }}">{{ $label }}</a></li>
                        @endforeach
                        <li class="sub-nav-item"><a class="sub-nav-link {{ $page === 'parties' ? 'active' : '' }}" href="{{ route('parties') }}">Manage Party</a></li>
                        <li class="sub-nav-item"><a class="sub-nav-link" href="{{ route('planner.attendance') }}" data-planner-event="attendance">Attendance</a></li>
                    </ul>
                </div>
            </li>
            @foreach([
                ['sidebarBattleStats', 'Battle Stats', 'bar-chart-alt-2', ['pvp-guild-league' => 'Guild League', 'pvp-siege' => 'Siege']],
                ['sidebarGuildRuns', 'Guild Runs', 'run', ['guild-runs' => 'Runs', 'guild-runs-history' => 'Run History']],
            ] as [$groupId, $groupLabel, $groupIcon, $links])
                @php($groupActive = array_key_exists($page, $links))
                <li class="nav-item">
                    <a class="nav-link menu-arrow {{ $groupActive ? 'active' : '' }}" href="#{{ $groupId }}" data-bs-toggle="collapse" role="button" aria-expanded="{{ $groupActive ? 'true' : 'false' }}" aria-controls="{{ $groupId }}">
                        <span class="nav-icon"><iconify-icon icon="bx:{{ $groupIcon }}"></iconify-icon></span>
                        <span class="nav-text">{{ $groupLabel }}</span>
                    </a>
                    <div class="collapse {{ $groupActive ? 'show' : '' }}" id="{{ $groupId }}">
                        <ul class="nav sub-navbar-nav">
                            @foreach($links as $routeName => $label)
                                <li class="sub-nav-item"><a class="sub-nav-link {{ $page === $routeName ? 'active' : '' }}" href="{{ route($routeName) }}">{{ $label }}</a></li>
                            @endforeach
                        </ul>
                    </div>
                </li>
            @endforeach
            <li class="nav-item">
                <a class="nav-link {{ $page === 'auction' ? 'active' : '' }}" href="{{ route('auction') }}">
                    <span class="nav-icon"><iconify-icon icon="bx:purchase-tag"></iconify-icon></span>
                    <span class="nav-text">Auction</span>
                </a>
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

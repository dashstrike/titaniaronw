# Titania Guild Management

Guild management tools for Titania on the Ragnarok Online World Dark Lord server: member records, event lineups, attendance, guild runs, battle statistics, maps, and auctions.

[Published site](https://dashstrike.github.io/titaniaronw/)

## Architecture

Laravel 13 and Blade render the pages using the Darkone Bootstrap 5 template. Browser JavaScript connects directly to the existing Supabase backend for authentication, profiles, permissions, planner state, and feature data. Laravel does not proxy those data requests.

The same views support two deployment modes:

- **Laravel hosting:** PHP serves pages from `public/`.
- **GitHub Pages:** `php artisan pages:export` renders HTML ahead of time. GitHub Pages serves the generated pages and browser assets; Supabase remains the runtime backend.

No local application database or Laravel migration step is required. Defaults use file sessions/cache and synchronous queues. Page rendering alone does not grant access to guild data; Supabase policies and database functions enforce access.

## Features

| Area | Functionality |
| --- | --- |
| Dashboard and members | Guild statistics, class and Gear Rating summaries, profiles, membership history, active/inactive status, and attendance summaries. |
| Member CSV review | Preview and reconcile updates before saving. CSV-only players become new members; active members missing from the CSV are marked inactive. |
| Guild League and Siege | Drag-and-drop or tap-to-place lineups, slot swapping, raid/team organization, party pools, public publishing, name search, and print/share exports. |
| Party management | 30 reusable reference parties with five member slots each. Saved member names/classes refresh automatically; inactive members are removed. |
| Attendance | Events, planned and actual attendance, notes, roster refresh, completion/reopening, and member history. |
| Guild runs | Time Echo, Mirage, and Calamity Zone runs; public registration, registration controls, status updates, and run history. |
| Guild League battle data | CSV imports retaining both guilds, date/session/battlefield filters, and searchable player statistics. Battle times use GMT+8. |
| Interactive maps | Guild League main/sub and Siege outer/inner/Emperium-room maps, with backgrounds, icons, labels, resizing, rotation, and saved layouts. |
| Auctions | Public registration for eight Mirage cards and 14 level-90 Royal accessories, item details, duck counts, receipt history, and administrator controls. |
| User access and activity | Approved profiles, role management, and restricted online-user/activity views. |

All 39 jobs in the verified SEA reference catalog are supported in Members. Job icons use the reference's exact assets, including a dedicated Scholar icon. See [job catalog notes](docs/job-catalog.txt) for sources and future updates.

Members uses explicit saves: class selection uses an inline searchable Select2 dropdown, and class/GR edits remain local drafts until Save in Actions (or Save all changes) is confirmed with SweetAlert2. Bulk class/GR tools also stage drafts. Member forms, status changes, and deletions require a confirmation; leaving with drafts offers Save, Discard, or Keep editing. Reloading/closing the browser uses its built-in unsaved-change warning.

Party Management stores reusable templates independently of event lineups. Editing or saving a template does not change an existing GL/Siege roster. Reload GL/Siege to load the latest templates into its Party Pool, then drag a template onto a team to apply it. With `sql/party_inactive_cleanup.sql` installed, inactive members are removed from saved templates at the database level and cannot be restored by stale saves.

**Current limitations:** Siege battle statistics (`/pvp-siege`) is a “Coming soon” page awaiting a Siege CSV format. Polarity Zone code and saved data remain present, but its UI/public access is hidden by `TITANIA_FEATURES.polarityZone: false` in `public/js/config.js`.

### Access roles

Management data requires an approved Supabase profile. Main capabilities:

| Role | Capabilities |
| --- | --- |
| Viewer | Read management data available to approved users. |
| Attendance Auditor | Manage attendance. |
| Party Organizer | Edit lineups, parties, members/CSV updates, maps, attendance, and guild runs. |
| Admin | Full management access, including user access, public lineup publishing, battle imports, and auction administration. |

Public lineups, run registration, and auction registration use dedicated Supabase functions. Public run and auction registration select a player from the active roster. Activity-history access has additional backend permission checks.

## Routes

| Route | Purpose |
| --- | --- |
| `/dashboard`, `/login` | Dashboard and authentication shell; `/` redirects to `/dashboard`. |
| `/members` | Member management. |
| `/member?id=<member-id>` | Individual member profile. |
| `/member-import-preview` | Member CSV review. |
| `/guild-league`, `/siege` | Management lineup planners. |
| `/parties`, `/attendance` | Reusable parties and attendance management. |
| `/guild-runs`, `/guild-runs-history` | Run management and history. |
| `/pvp-guild-league`, `/pvp-siege` | Guild League statistics and Siege placeholder. |
| `/maps-gl`, `/maps-siege` | Interactive map editors. |
| `/auction`, `/users`, `/help` | Auction management, user access, and planner usage guide. |
| `/public/guild-league`, `/public/siege` | Published lineups. |
| `/titaniaruns`, `/titaniaauction` | Public runs/auctions and registration. |
| `/public/polarity-zone` | Retained page, subject to the feature flag. |

`/index` and `/home` redirect to the dashboard. Compatibility redirects exist for selected original `.html` URLs and retain query parameters. Static redirects also preserve fragments for recovery callbacks. Laravel's legacy Guild League/Siege `.html` URLs target public lineups; static exports target the management paths to accommodate GitHub Pages URL resolution.

## Local setup

### Requirements

- PHP **8.3+** and extensions required by the locked Composer dependencies.
- Composer.
- An existing Supabase project with the application's schema, policies, and functions.
- Node.js for JavaScript tests only. There is no npm/Vite build step; supplied template assets are already compiled.

For a new checkout:

```sh
composer install
```

Copy `.env.example` to `.env` if it does not already exist, then configure:

```dotenv
APP_URL=http://127.0.0.1:8015
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Generate an application key and start the server:

```sh
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8015
```

Open `http://127.0.0.1:8015`. Preserve `APP_KEY` on subsequent deployments.

### Laragon on Windows

Set the virtual host document root to `C:\laragon\www\titaniaronw\public` and `APP_URL` to the configured hostname, for example `http://titaniaronw.test`.

If PHP and Composer are not on `PATH`, invoke the installed binaries directly:

```powershell
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe C:\laragon\bin\composer\composer.phar install
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan key:generate
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan serve --host=127.0.0.1 --port=8015
```

Adjust paths for your installation.

## Configuration

| Variable | Purpose / default |
| --- | --- |
| `APP_NAME` | Application name; `Titania Guild Management` in `.env.example`. |
| `APP_URL` | Local or deployed base URL. Include the repository path for static hosting. |
| `SUPABASE_URL` | Browser-accessible Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Public client key; static export also accepts a legacy `anon` key. |
| `TITANIA_DEVELOPMENT_PROJECT` | Optional development project reference. In `local`, page rendering returns HTTP 503 unless the Supabase hostname matches `<reference>.supabase.co`. Export refuses this development connection. |
| `TITANIA_AUCTION_WORKFLOW` | Advanced auction controls; defaults to `false` locally. The Pages workflow defaults to `true` unless its Actions variable overrides it. |
| `TITANIA_ASSET_VERSION` | Asset version setting in `config/titania.php`; defaults to `laravel-1`. Many feature assets also use modification times for cache busting. |

The layout exposes the Supabase URL, public key, application name, auction flag, and local-development flag through `window.TITANIA_CONFIG`. **Never use a service-role key, secret key, or database password in browser configuration.**

Supabase sessions are browser-local and specific to the site's origin; changing hostname requires signing in again. Configure Supabase email-confirmation and recovery redirects for the actual local/deployed URLs, including the site root and `/dashboard`. Hosted Supabase Auth sends its own emails; Laravel mail settings do not configure Supabase email delivery.

### Database SQL

`sql/` contains feature setup scripts, upgrades, historical references, and SQL tests. It is **not a complete, ordered migration system** for provisioning a new backend. Some scripts create objects without replacement guards; some upgrades modify existing data. Review prerequisites against the target schema instead of running the directory wholesale. Laravel and GitHub Pages deployment do not apply SQL.

| Files in `sql/` | Area |
| --- | --- |
| `supabase_setup.sql`, `titania_setup.sql` | Historical planner/auth setup references. |
| `public_view_setup.sql`, `siege_public_setup.sql`, `raid_team_names.sql` | Public lineups and raid/team naming. |
| `attendance_setup.sql`, `admin_delete_attendance_event.sql` | Attendance and administrator deletion. |
| `interactive_maps_setup.sql` | Map layouts and access policies. |
| `party_inactive_cleanup.sql` | Remove inactive members from saved parties and prevent stale saves from restoring them. Requires existing planner and party tables. |
| `pvp_data_setup.sql`, `pvp_battle_time.sql`, `pvp_gl_gmt8_correction.sql` | Battle imports and existing-data time upgrades/corrections. |
| `guild_league_mvp.sql` | Guild League MVP support. |
| `user_activity_*.sql`, `admin_delete_user.sql` | Activity tracking, access restrictions, and user deletion. |
| `card_auction_*.sql`, `accessory_auction_setup.sql`, `auction_*.sql` | Auction setup, receipt history, and workflow upgrades. |

### Advanced auction workflow

Adds carry-forward/NEXT BIDDER status, later-round outbid handling, duck adjustments, withdrawals, receipt recording, temporary bans across categories, action history, and undo for the latest eligible action. Request/revision checks protect against stale updates. Administrative actions require an approved admin profile.

For a backend with the existing card/accessory registration and receipt-history setup, apply reviewed upgrades in this order:

1. `sql/auction_last_received.sql`
2. `sql/auction_workflow.sql`
3. `sql/auction_add_duck.sql`

The first requires `card_auction_history.sql` and `accessory_auction_setup.sql`; the workflow also assumes existing auction RPCs. Historical `card_auction_ongoing.sql` and `card_auction_ducks.sql` upgrade older schemas and are not blanket fresh-install steps. Enable `TITANIA_AUCTION_WORKFLOW=true` after matching backend functions are installed. See [auction development notes](docs/auction-development.txt) for workflow behavior and development checks.

## GitHub Pages deployment

[The Pages workflow](.github/workflows/pages.yml) runs on pushes to `main` and manual dispatch. It installs Composer dependencies, runs Laravel tests, exports the site, and deploys `storage/app/pages`.

Set the repository's Pages publishing source to **GitHub Actions** and configure these Actions variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- Optional: `TITANIA_AUCTION_WORKFLOW=false` to disable advanced controls. Otherwise the workflow enables them, so production SQL prerequisites must already be installed.

Export locally using production public settings rather than a pinned development connection:

```sh
php artisan pages:export --url=https://dashstrike.github.io/titaniaronw
```

Each export replaces `storage/app/pages`. Output contains rendered route directories such as `login/index.html` and `public/siege/index.html`, browser assets, compatibility redirects, `.nojekyll`, and a custom `404.html`. PHP source, `.env`, SQL, logs, and server dependencies are excluded. The exporter rejects privileged keys and the configured development connection.

Static hosting cannot execute PHP endpoints. Features requiring server execution need Laravel hosting or a backend function.

## Laravel production hosting

Serve **`public/`** with Apache or Nginx and PHP 8.3+. Configure `.env` with the intended Supabase project, `APP_ENV=production`, `APP_DEBUG=false`, and the HTTPS `APP_URL`.

```sh
composer install --no-dev --prefer-dist --optimize-autoloader
# New installation only; retain an existing APP_KEY.
php artisan key:generate
php artisan optimize
```

The web-server user needs write access to `storage/` and `bootstrap/cache/`. Apply reviewed Supabase changes separately.

## Verification

With Composer dependencies installed:

```sh
php artisan test
php artisan view:cache
php artisan route:list
```

PHP feature tests check route rendering, DOM hooks, local assets, configuration exposure, static exports, development-connection guards, and auction markup without accessing live Supabase.

JavaScript regressions use Node's built-in runner without npm dependencies:

```sh
node --test tests/js/*.test.cjs
```

They cover recovery, roster search, parties, CSV review, lineup exports, raid names, PvP CSV handling, MVP display, activity tracking, and auction controls. The Pages workflow currently runs PHP tests; JavaScript/browser checks are separate.

Optional browser regressions use local assets and synthetic data:

```sh
node tests/browser/roster-search.cjs
node tests/browser/auction-dropdown.cjs
```

They expect Google Chrome at its standard Windows path. Set `CHROME_PATH` to use another compatible executable.

SQL tests need a prepared development database. `tests/auction_workflow.sql` requires development fixtures and rolls back its changes; it is not part of `php artisan test`. `tests/party_inactive_cleanup.sql` checks removal across parties, stale saves, empty parties, and reactivation using rollback-only fixtures and an approved development admin. Other SQL checks are in `sql/*_test.sql`.

Before release, verify sign-in/sign-out, email recovery, public views/registrations, authorized saves, and responsive layouts in a connected browser. Local rendering and synthetic tests do not verify the deployed Supabase schema or policies.

## Repository layout

```text
app/Http/Controllers/PageController.php   Page rendering and browser configuration
app/Console/Commands/ExportPages.php      Static exporter
config/titania.php                       Supabase settings and feature flags
config/auction.php                       Mirage card catalog
config/accessory.php                     Royal accessory catalog
routes/web.php                           Page routes and compatibility redirects
resources/views/layouts/                 Shared Darkone shell
resources/views/pages/                   Feature pages
resources/views/partials/                Navigation and shared feature markup
public/js/pages/                         Planner, public lineup, member, and map scripts
public/js/                               Shared and feature browser workflows
public/css/                              Component styles and template integration
public/images/                           Logos, job icons, items, and artwork
public/vendor/                           Compiled template and bundled assets
sql/                                     Backend SQL references, upgrades, and checks
docs/                                    Development notes
tests/Feature/                           Laravel rendering/export tests
tests/js/                                Node regression tests
tests/browser/                           Chrome regression scripts
.github/workflows/pages.yml              Pages build and deployment
```

## Credits and licensing

Titania's original planner is adapted from [RO World Planner](https://github.com/cajancharles/roworldplanner) by CharlesPlaysGG. The MIT license and Titania modification attribution are retained in [LICENSE](LICENSE). Darkone is the supplied commercial template by StackBros; its assets remain subject to the template license.

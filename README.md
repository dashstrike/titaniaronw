# Titania Guild Management

Laravel 13 with Blade views, the supplied Darkone Bootstrap 5 template, and the existing Supabase backend. Requires PHP 8.3 or newer and Composer.

Laravel serves the pages and public configuration. Supabase continues to handle authentication, profiles, role authorization, planner saves, public lineup functions, attendance, member history, CSV imports, and guild runs. No database schema or data was changed during conversion. No local application database is required; Laravel uses file sessions/cache and synchronous queues.

## Layout

```text
app/Http/Controllers/PageController.php   Page rendering
config/titania.php                        Public Supabase settings
routes/web.php                            Clean page routes and legacy URL redirects
resources/views/layouts/app.blade.php     Shared Darkone layout
resources/views/partials/                 Sidebar and topbar
resources/views/pages/                    All 11 original pages as Blade views
public/images/                            Titania logo and favicons
public/images/job/                        Job icons and job-icons.json
public/images/title/                      Title artwork
public/css/                               Existing component styles and theme integration
public/js/                                Existing Supabase workflows and layout integration
public/js/pages/                          JavaScript extracted from the original HTML
public/vendor/darkone/                    Compiled template CSS, JavaScript, and fonts
sql/                                     Existing SQL references, not deployment scripts
tests/Feature/TitaniaPagesTest.php        Route, asset, and configuration checks
```

The old `pub` folder is now `public/images`. Use `asset('images/titania-logo.webp')` in Blade. Pages use clean Laravel URLs such as `/dashboard`, `/members`, `/member?id=...`, and `/public/guild-league`. Old `.html` bookmarks redirect to their clean routes and retain query parameters.

The planner's specialized drag/drop cards and attendance controls retain their DOM IDs and JavaScript. Darkone supplies the navigation, topbar, responsive shell, and base theme. Existing component styles are scoped to `#titania-content` so they do not restyle the template navigation.

## Local setup with Laragon

This checkout already has its local `.env` and Composer dependencies installed. The `.env` preserves the existing public Supabase project URL and publishable key.

Set the Laragon site's document root to:

```text
C:\laragon\www\titaniaronw\public
```

For a new checkout, copy `.env.example` to `.env`, supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, then run:

```powershell
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe C:\laragon\bin\composer\composer.phar install
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan key:generate
```

To run a local preview without changing Laragon's virtual host:

```powershell
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan serve --host=127.0.0.1 --port=8015
```

Open `http://127.0.0.1:8015`. The supplied Darkone assets are compiled, so Node/npm is not needed to serve the application.

## Supabase configuration

Only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the application name are exposed to the browser. Never put a service-role key, database password, or other privileged credential in these public settings.

Authentication and data requests still go directly from the existing browser client to Supabase. The existing RLS policies and database functions remain the authorization boundary. Laravel page routes serve the empty UI; they do not grant access to private guild records. User sessions remain browser-local to the origin, so switching from the former hosting domain to the Laravel domain requires signing in again.

In Supabase Authentication URL Configuration, allow the actual management URLs used for email confirmation and password recovery, including the root URL and `/dashboard`. For the preview, these are `http://127.0.0.1:8015/` and `http://127.0.0.1:8015/dashboard`; for Laragon, use the configured local hostname. Add the final HTTPS domain when deploying. These dashboard settings were not changed by this conversion.

Do not rerun the historical SQL files as part of Laravel setup. They do not contain every table/function used by the current app.

## Ubuntu deployment

Use PHP 8.3+ with the required Laravel extensions and Composer. Configure Apache or Nginx to serve the application's **public** directory, never its repository root. Keep the same Supabase values in the server's `.env`, set `APP_ENV=production`, `APP_DEBUG=false`, and set `APP_URL` to the site's HTTPS origin.

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan key:generate
php artisan optimize
```

Generate `APP_KEY` only for a new installation; preserve it on subsequent deployments. The PHP/web-server user needs write access to `storage/` and `bootstrap/cache/`. No database setup command is needed.

## Verification

```powershell
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan view:cache
& C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan route:list
```

The automated PHP tests check all page routes, original DOM hooks, local asset paths, public configuration exposure, and unavailable private-file routes without accessing Supabase. JavaScript syntax is checked separately. Authenticated saving, account recovery, and final responsive appearance still need testing in a connected browser with an authorized Supabase account.

## Credits

Titania's original planner is adapted from [RO World Planner](https://github.com/cajancharles/roworldplanner) by CharlesPlaysGG. The original MIT license is retained in `LICENSE`. Darkone is the supplied commercial template by StackBros; its assets remain subject to the user's template license.

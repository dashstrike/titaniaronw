# Titania Guild Management - GitHub Pages + Supabase

Titania Guild Management is a browser-based guild planning tool hosted on GitHub Pages, with Supabase providing:

- Email/password registration and login
- Password reset
- Pending-account approval
- Viewer / Leader / Admin roles
- PostgreSQL-backed shared planner state
- Row Level Security (RLS)
- Revision conflict protection for concurrent edits
- Direct Raid Leader and ATK/DEF saves
- Guild League and Polarity Zone planning
- Public read-only lineup pages with per-event publish controls
- Print/share, export/import, and drag/drop team management

## Important security rule

`config.js` must contain ONLY:

- Supabase Project URL
- Supabase Publishable key

These are intended for browser applications when RLS is enabled.

**Never put a Supabase secret key, `service_role` key, database password, SMTP password, or other private credential in GitHub, `config.js`, HTML, or browser JavaScript.**

---

## Step 1 - Create the Supabase project

1. Sign in to Supabase and create a new project.
2. Open the project's SQL Editor.
3. Run the SQL setup files in this order:
   - `supabase_setup.sql`
   - `attendance_setup.sql`
   - `public_view_setup.sql`
4. Open Project Settings / API and copy:
   - Project URL
   - Publishable key
5. Put those two values into `config.js`.

`public_view_setup.sql` is the canonical public-lineup database setup and defines the current `get_public_lineup(p_view text)` RPC used by Guild League, Siege, and Polarity Zone public pages. `siege_public_setup.sql` is retained as a legacy/compatibility copy and should not be required for a fresh setup after `public_view_setup.sql` has been run.

## Step 2 - Configure Supabase Auth

In Supabase Authentication URL settings, set your final GitHub Pages address as the Site URL and add it to Redirect URLs.

For a project repository, the address normally looks like:

`https://YOUR-GITHUB-USERNAME.github.io/titania-guild-management/`

You can temporarily add both the GitHub Pages URL and any local testing URL you use.

## Step 3 - Create the GitHub repository

Create a repository such as:

`titania-guild-management`

Upload the website files to the repository root, including:

- `index.html`
- `config.js`
- Public lineup pages such as `guild-league.html` and `polarity-zone.html`
- `.nojekyll`
- `README.md`
- Any required SQL setup files
- Website assets such as the Titania logo

Do not upload any Supabase secret/service-role keys or SMTP credentials.

## Step 4 - Turn on GitHub Pages

In GitHub:

1. Repository > Settings > Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/(root)`
5. Save

Your website should then publish at a URL similar to:

`https://YOUR-GITHUB-USERNAME.github.io/titania-guild-management/`

## Step 5 - Create your own Titania account

Open the website and choose Register.

Use your own email and password. New users are intentionally created as `pending` and cannot open the planner until approved.

If Supabase email confirmation is enabled, confirm your email first.

## Step 6 - Make yourself the first Admin

After you have registered, return to Supabase > SQL Editor and run:

```sql
update public.profiles
set role = 'admin', approved = true
where email = 'YOUR_EMAIL_HERE';
```

Replace `YOUR_EMAIL_HERE` with the exact email you registered.

Reload the website and sign in. You will now see the `Users` button in the top bar.

## Step 7 - Approve other users

Other guild users only register through the Titania website. They do **not** need Supabase.com accounts.

When a user registers:

1. Their account is created in Supabase Auth.
2. A `profiles` row is created automatically.
3. The account remains Pending.
4. An Admin opens `Users` inside Titania.
5. Choose a role and tick Approved.
6. Save.

Roles:

- `viewer` - can open and print/export the planner but is read-only
- `leader` - can edit roster, assignments, raid leaders and modes
- `admin` - same as Leader plus user approval/role management

## Public lineup pages

The project includes separate read-only public pages for Guild League, Siege, and Polarity Zone.

Visitors do not need to register or sign in to view an event that has been published.

Leader/Admin users can control each event separately with the **Public View: ON / OFF** switch inside the management app.

- **ON** - the event lineup is available on its public page.
- **OFF** - the lineup remains private and the public page displays a not-published message.

The public access function is designed to expose only the lineup information required by the public pages rather than the full private planner state.

## Database approach

The planner is stored as one transactional JSONB document in `public.planner_state`, while authentication and user roles live separately in Supabase Auth and `public.profiles`.

Attendance is stored separately in `public.attendance_events` and `public.attendance_records` so historical event records and actual attendance do not need to be embedded into the planner JSON document.

This preserves the application's existing planner state model and revision logic.

Core database functions include:

- `save_planner_state` - full autosave with revision checking
- `save_raid_leader_setting` - direct Raid Leader save
- `save_raid_mode_setting` - direct ATK/DEF save
- `get_public_lineup(p_view text)` - safe published lineup access for Guild League, Siege, and Polarity Zone

The planner data can be normalized into separate members, assignments, history, and audit tables later if needed without changing the visible design.

## Account recovery

The Login screen includes `Forgot password?`. Supabase emails a recovery link back to the website, where the user can set a new password.

For production use, configure a custom SMTP provider in Supabase rather than relying on the limited built-in test email service.

## If saving says REVISION_CONFLICT

That means another Leader/Admin saved a newer version first. Reload the newest planner when prompted to avoid overwriting another user's changes.

## Security

The GitHub repository may safely contain the Supabase **Project URL** and **publishable key** when Row Level Security is correctly configured.

Never commit:

- Supabase secret or `service_role` keys
- Database passwords or connection strings containing passwords
- SMTP passwords or SMTP keys
- Gmail App Passwords
- GitHub Personal Access Tokens
- Any other privileged credential

## Credits

Titania Guild Management Tool is based on and adapted from [RO World Planner](https://github.com/cajancharles/roworldplanner), originally created by [CharlesPlaysGG](https://github.com/cajancharles).

The original project provided the foundation for the guild lineup planner and team-management concepts. This Titania version has been independently modified and extended with custom Guild League and Polarity Zone layouts, Supabase authentication and storage, user roles, public lineup views, raid-leader controls, publish controls, and other guild-specific features.

Please retain the original project's MIT license and copyright notice where required by its license terms.

# Titania Guild Management - GitHub Pages + Supabase

This package converts the current Titania Apps Script web app into a normal static website hosted on GitHub Pages with Supabase providing:

- Email/password registration and login
- Password reset
- Pending-account approval
- Viewer / Leader / Admin roles
- PostgreSQL-backed shared planner state
- Row Level Security (RLS)
- Revision conflict protection for concurrent edits
- Direct Raid Leader and ATK/DEF saves
- The existing Titania UI, roster, Guild League, Polarity Zone, print/export/import and drag/drop logic

## Important security rule

`config.js` must contain ONLY:

- Supabase Project URL
- Supabase Publishable key

These are intended for browser applications when RLS is enabled.

**Never put a Supabase secret key or `service_role` key in GitHub, `config.js`, HTML, or browser JavaScript.**

---

## Step 1 - Create the Supabase project

1. Sign in to Supabase and create a new project.
2. Open the project's SQL Editor.
3. Paste the entire contents of `supabase_setup.sql` and run it once.
4. Open Project Settings / API and copy:
   - Project URL
   - Publishable key
5. Put those two values into `config.js`.

## Step 2 - Configure Supabase Auth

In Supabase Authentication URL settings, set your final GitHub Pages address as the Site URL and add it to Redirect URLs.

For a project repository, the address normally looks like:

`https://YOUR-GITHUB-USERNAME.github.io/titania-guild-management/`

You can temporarily add both the GitHub Pages URL and any local testing URL you use.

## Step 3 - Create the GitHub repository

Create a repository such as:

`titania-guild-management`

Upload the contents of this folder to the repository root:

- `index.html`
- `config.js`
- `supabase_setup.sql`
- `.nojekyll`
- `README.md`

Do not upload any Supabase secret/service-role keys.

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

## Step 8 - Move your existing Titania data

The safest migration method is to use your current Apps Script application's existing Export button.

1. Open the current Apps Script version.
2. Click Export and keep the generated JSON backup.
3. Open the new Supabase website as an Admin/Leader.
4. Click Import.
5. Select the JSON backup.
6. Confirm the import.
7. Wait until the header shows `Saved`.
8. Reload the site and verify Guild League, Polarity Zone, roster, raid leaders and membership history.

Keep the old Google Sheet / Apps Script version untouched until you have verified the new website.

## Database approach

To minimize migration risk, this first Supabase version stores the planner as one transactional JSONB document in `public.planner_state` while authentication/roles live in `public.profiles`.

This deliberately preserves the application's existing state model and revision logic instead of rewriting all Guild League / Polarity Zone functions at once.

The database functions are:

- `save_planner_state` - full autosave with revision checking
- `save_raid_leader_setting` - direct Raid Leader save
- `save_raid_mode_setting` - direct ATK/DEF save

This can be normalized into separate members/assignments/history tables later if needed without changing the visible design.

## Account recovery

The Login screen includes `Forgot password?`. Supabase emails a recovery link back to the website, where the user can set a new password.

## If saving says REVISION_CONFLICT

That means another Leader/Admin saved a newer version first. Reload the newest planner when prompted. This is the same concurrency protection concept the Apps Script version used.

## Files no longer needed after migration

Once the Supabase website is fully tested, the live website does not require `Code.gs` or Google Sheets for storage.

Keep your old Sheet as a backup until you are comfortable with the new system.

## Credits

Titania Guild Management Tool is based on and adapted from
[RO World Planner](https://github.com/cajancharles/roworldplanner),
originally created by [CharlesPlaysGG](https://github.com/cajancharles).

The original project provided the foundation for the guild lineup planner,
including its team-management and drag-and-drop concepts.

This version has been independently modified and extended for the Titania guild,
including custom Guild League and Polarity Zone layouts, Supabase authentication,
public lineup views, raid-leader controls, user permissions, and other features.

Original project: https://github.com/cajancharles/roworldplanner


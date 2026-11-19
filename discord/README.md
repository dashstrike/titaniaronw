# Titania Discord attendance

Cloudflare Free Worker for Guild League Tuesday/Thursday and Siege. Only **Going** and **Not going** buttons are posted. Nonresponders keep No response. No voice tracking or paid hosting is configured.

The website retains its existing management permissions and manual ticks. Discord writes the same `attendance_records.pre_status` field; it never sets actual attendance or notes. The latest deliberate website edit or Discord click wins. Repeated delivery of the same Discord interaction does not write again. Visible planner badges refresh every 20 seconds and on focus. Deploy the website change separately through its existing GitHub Pages workflow.

## Linking

Member profiles include a Discord Account card with avatar, current Discord username/server nickname, link status, linked date/method, Open Discord Profile and Copy ID. Approved Titania users can read it; only approved `admin` and `party_organizer` profiles can link, change or unlink accounts. Mutations require confirmation in the website and check the previous account ID to prevent overwriting another manager's concurrent edit. The Worker validates each website session against Supabase Auth and loads its approved profile/role server-side. No bot token or service-role key is sent to the browser. Missing/left Discord accounts retain their existing link with profile details unavailable. The card does not request presence or emails, and unlinking never deletes attendance.

The `/member-discord` endpoint permits only the configured GitHub Pages origin and local Laragon/8015 origins. Add an explicit origin in `websiteRequest()` before using another domain; do not replace this list with a wildcard. Deploy the Worker before publishing the Blade/member-script changes through the normal Pages workflow. The website uses the existing free Cloudflare account-link namespace; no additional Supabase tables are needed.

First response: match the Discord **server nickname** to exactly one active roster name, ignoring case and repeated whitespace. No fuzzy matching, global display-name fallback, or automatic member creation. Inactive/unmatched/ambiguous names and already-claimed characters are rejected privately. Management should control nicknames: disable **Change Nickname** for ordinary members. Automatic name matching is not proof of identity if members can freely impersonate each other's nicknames.

The private Cloudflare `AttendanceStore` stores both directions of the account link atomically. Later clicks use the stable Discord user ID and Titania member ID, not the nickname. CSV renames preserve links when the same member record is updated. If a CSV creates a new member ID, management must unlink/relink; inactive or deleted linked characters are never silently rebound. No Supabase schema change is required. Keep this Cloudflare namespace when redeploying: deleting it loses links, message registrations and duplicate-delivery receipts.

## Deploy from this folder

Use Node.js 22. Install the exact locked CLI with `npm ci`. Deployment adds a SQLite-backed Durable Object namespace, supported on Workers Free. The `migrations` section in `wrangler.toml` is Cloudflare's namespace declaration, not a Laravel migration or a change to the application's database.

```powershell
cd C:\laragon\www\titaniaronw\discord
npm ci
npx wrangler login
npm run deploy
```

Login opens Cloudflare authorization. Deployment uses `--keep-vars` to retain dashboard variables; existing secrets are also retained. Stay on **Workers Free**. Check the deployment is targeting the existing Dashstrike account and `titania-attendance` Worker. Commands above deploy infrastructure/code only; they do not post Discord messages or change attendance. Do not activate a paid Workers plan. Free quota exhaustion can reject requests; no paid plan is needed by this implementation.

## Cloudflare variables and secrets

| Name | Value | Secret |
| --- | --- | --- |
| `DISCORD_APPLICATION_ID` | `1562532538847596776` (verify under Discord General Information) | No |
| `DISCORD_GUILD_ID` | `505382879983960064` | No |
| `DISCORD_ATTENDANCE_CHANNEL_ID` | `1572811638560522321` | No |
| `DISCORD_PUBLIC_KEY` | Public Key from Discord General Information | No |
| `DISCORD_BOT_TOKEN` | Token from Discord Bot settings | Yes |
| `SUPABASE_URL` | `https://dczcesmpbfurpllqpkml.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy `service_role` JWT from the matching Supabase project's API keys | Yes |

The service-role key is privileged. It belongs **only in Cloudflare secrets**, never in Laravel's browser config, public JavaScript, GitHub Pages, or chat. This Worker exposes no generic database endpoint: it verifies Discord signatures/timestamps and restricts server, channel, application and message identity before processing. The application's existing Supabase RLS policies remain unchanged. Discord role permission checks are additional bot checks; they do not replace website management permissions.

This CLI deployment creates the required `ATTENDANCE` binding. Copying just `worker.mjs` into the dashboard editor is insufficient for this version. Set the Discord **Interactions Endpoint URL** to `https://titania-attendance.dashstrike.workers.dev` after deployment.

## Register the server command once

After deploying, set Discord's Interactions Endpoint URL to **`https://titania-attendance.dashstrike.workers.dev/interactions`** and Save Changes. The signed Discord verification request registers `/attendance` automatically using the token already stored privately at Cloudflare. The Worker records that setup completed and leaves other commands unchanged. If registration fails, check Cloudflare logs for the setup error, correct the token/installation, then save the endpoint again (switch between the root and `/interactions` URLs to trigger verification). The public GET health page does not register commands.

The local registration script below is an optional fallback; it is not needed when automatic setup succeeds.

Registration requires the bot token locally, independently of the secret already saved at Cloudflare. Use this PowerShell prompt (input hidden); the token is not placed in shell history or printed:

```powershell
$discordToken = Read-Host 'Discord bot token' -AsSecureString
$env:DISCORD_BOT_TOKEN = [System.Net.NetworkCredential]::new('', $discordToken).Password
try { npm run register } finally { Remove-Item Env:DISCORD_BOT_TOKEN; $discordToken.Dispose() }
```

The registration script creates/updates only `/attendance` for this server and does not overwrite unrelated commands. Bot needs View Channel, Send Messages, Embed Links and the `bot` / `applications.commands` install scopes. It may look offline because this bot uses HTTP interactions, not a persistent Gateway connection.

## Use in the configured attendance channel

Management with **Administrator** or **Manage Server** can run:

```text
/attendance post event:Siege
/attendance post event:Guild League Thursday date:2026-11-26
/attendance link user:@Player character:Exact Titania Name
/attendance unlink user:@Player
```

If date is omitted, it selects the next appropriate weekday in GMT+8, including today. Explicit dates must match the event's weekday and cannot be in the past. Posting never reopens a closed event; management must reopen it on the website. Public event messages contain exactly two buttons; confirmations and errors are private. Existing attendance records, including management's manual values, are not reset when a message is posted. Responses reject deleted/closed events. Changes made after a response commits can still override it, as with existing website edits.

Links and message records are server-side. Interaction receipts are retained for approximately 24 hours and cleaned up by a free Durable Object alarm. Signature freshness is five minutes. If processing is interrupted, the bot reports that attendance could not be confirmed; check the website before clicking again. A Cloudflare/Discord outage or exhausted free quota can prevent processing—do not treat a missing confirmation as saved attendance.

## Validation

```powershell
npm test
npx wrangler deploy --dry-run --outdir ../storage/app/discord-worker-build
```

Tests use synthetic members and mocked APIs. They verify signed requests, guild/channel restrictions, management controls, duplicate delivery, unique links, CSV/name changes, closed events, and preservation of actual attendance/notes. Real Discord posting and attendance writes are not exercised automatically. Deployment and command registration require your own authenticated accounts/secrets.

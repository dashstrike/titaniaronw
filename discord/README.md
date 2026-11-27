# Titania Discord attendance

Cloudflare Free Worker for Guild League Tuesday/Thursday and Siege. Only **Going** and **Not going** buttons are posted. Nonresponders keep No response. A separate on-demand voice snapshot command exports a CSV; no continuous voice tracking or paid hosting is configured.

## Voice channel CSV

Management can run `/voice-list voice_channel:#Bengkel-Pintar-Titania post_in:#your-text-channel` in any text channel in the Titania server. The bot connects to Discord Gateway when the command runs, reads the current members of the selected voice channel, and posts `voice-list.csv` in the selected text channel. The CSV has one name column: server nickname, falling back to display name or username. It is a one-time snapshot: people joining or leaving afterward do not change the file. This command does not change attendance, member links, or the guild roster. The private command reply confirms the count and destination; the CSV post is visible to members who can view that destination. The bot needs **View Channel**, **Send Messages**, and **Attach Files** in the destination. If Gateway is unavailable, retry the command; no CSV is posted from an incomplete snapshot.

The website retains its existing management permissions and manual ticks. Discord writes the same `attendance_records.pre_status` field; it never sets actual attendance or notes. The latest deliberate website edit or Discord click wins. Repeated delivery of the same Discord interaction does not write again. Visible planner badges refresh every 20 seconds and on focus. Deploy the website change separately through its existing GitHub Pages workflow.

## Linking

Guild Runs reads Discord IDs and usernames from `member_discord_accounts` in one query when loading the page. Copying a mention uses the ID already in memory and does not call Discord. Apply `discord_account_mirror` before deploying the Worker and website. The table permits reads only by approved admins/party organizers, and writes only by the service role. The existing link-status table retains its broader approved-member badge access.

The Durable Object remains authoritative for links. Link changes and unlinks update both mirrors, with alarm retries on failure. A scheduled check queues existing links once per UTC day, backfilling accounts on first deployment and refreshing changed usernames thereafter. Alarms process ten accounts at a time. Discord lookup failures still save the ID for tagging and queue a retry for the username. Unlinking clears both ID and username. New Cloudflare schedules may take up to 15 minutes to activate; verify the backfill with counts from `member_discord_accounts` before considering the rollout complete. The scheduled task does not post Discord messages.

The member profile reads its Linked / Not linked badge from the `member_discord_link_status` Supabase table, so opening a profile does not call Cloudflare. **Load details** remains optional and reads the private Worker record when account names, avatar, or link controls are needed. The Worker updates the status table after automatic links, management links, and unlinks; a Durable Object alarm retries failed status writes. Apply the `discord_link_status` migration before deploying this Worker version, then run the one-time Durable Object backfill so links created before the migration have badges. The table contains only member ID, link status, and update time. Only approved signed-in Titania users can read it; only the Worker service role can write it.

Member profiles include a Discord Account card with avatar, current Discord username/server nickname, link status, linked date/method, Open Discord Profile and Copy ID. Approved Titania users can read it; only approved `admin` and `party_organizer` profiles can link, change or unlink accounts. Mutations require confirmation in the website and check the previous account ID to prevent overwriting another manager's concurrent edit. The Worker validates each website session against Supabase Auth and loads its approved profile/role server-side. No bot token or service-role key is sent to the browser. Missing/left Discord accounts retain their existing link with profile details unavailable. The card does not request presence or emails, and unlinking never deletes attendance.

The `/member-discord` endpoint permits only the configured GitHub Pages origin and local Laragon/8015 origins. Add an explicit origin in `websiteRequest()` before using another domain; do not replace this list with a wildcard. Deploy the Worker before publishing the Blade/member-script changes through the normal Pages workflow. The website uses the existing free Cloudflare account-link namespace and the new Supabase link-status table for the profile badge.

First response: match the Discord **server nickname**, or **global display name** when no server nickname is set, to exactly one active roster name, ignoring case and repeated whitespace. No fuzzy matching or automatic member creation. Inactive/unmatched/ambiguous names and already-claimed characters are rejected privately. Management should control nicknames: disable **Change Nickname** for ordinary members. Automatic name matching is not proof of identity if members can freely impersonate each other's nicknames.

The private Cloudflare `AttendanceStore` stores both directions of the account link atomically. Later clicks use the stable Discord user ID and Titania member ID, not the nickname. CSV renames preserve links when the same member record is updated. If a CSV creates a new member ID, management must unlink/relink; inactive or deleted linked characters are never silently rebound. The link-status table is only a read-optimized mirror. Keep this Cloudflare namespace when redeploying: deleting it loses links, message registrations and duplicate-delivery receipts.

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

After deploying, set Discord's Interactions Endpoint URL to **`https://titania-attendance.dashstrike.workers.dev/interactions`** and Save Changes. The signed Discord verification request registers `/attendance` and `/voice-list` automatically using the token already stored privately at Cloudflare. The Worker records that setup completed and leaves other commands unchanged. If registration fails, check Cloudflare logs for the setup error, correct the token/installation, then save the endpoint again (switch between the root and `/interactions` URLs to trigger verification). The public GET health page does not register commands.

The local registration script below is an optional fallback; it is not needed when automatic setup succeeds.

Registration requires the bot token locally, independently of the secret already saved at Cloudflare. Use this PowerShell prompt (input hidden); the token is not placed in shell history or printed:

```powershell
$discordToken = Read-Host 'Discord bot token' -AsSecureString
$env:DISCORD_BOT_TOKEN = [System.Net.NetworkCredential]::new('', $discordToken).Password
try { npm run register } finally { Remove-Item Env:DISCORD_BOT_TOKEN; $discordToken.Dispose() }
```

The registration script creates/updates only `/attendance` and `/voice-list` for this server and does not overwrite unrelated commands. Bot needs View Channel, Send Messages, Embed Links, Attach Files and the `bot` / `applications.commands` install scopes. It may look offline because this bot uses HTTP interactions and connects to Gateway only briefly for a voice snapshot.

## Use in the configured attendance channel

On the website, **Finish Attendance** closes the selected event and requests the next Discord pre-attendance in the cycle **Tuesday GL → Thursday GL → Sunday Siege → Tuesday GL** (GMT+8). Closing an older historical event selects the next current calendar event rather than posting a past date. The server verifies the source is closed and requires approved `admin`, `party_organizer`, or `attendance_auditor` access. A stored target-event receipt prevents duplicate auto-posts and reuses posts made by `/attendance post`. Existing responses on the target event are retained. If Discord fails, the original event remains closed and the website displays a warning. If a network outcome is uncertain, automatic retries are blocked: check Discord before manually posting. Posting is triggered only by this explicit finish action; opening member profiles does not trigger it. Deploy the website's updated `attendance-page.js` and its loader after deploying the Worker.

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

# Guild League raid organization

Approved organizers/admins organize parties directly on the Guild League roster, using the party drag handle as in Siege. Drop onto another raid to move the entire party, onto another party in the same raid to swap their positions, or onto the **Add raid** area to create a raid. Moves and swaps use the existing automatic roster saving. Raid removal requires confirmation. Tap a handle then a raid as an alternative to dragging.

| Limit | Main | Sub |
| --- | --- | --- |
| Raids | 1–5 | 1–5 |
| Total parties, including empty parties | 12 | 18 |
| Players | 60 | 90 |
| Parties per raid | 1–8 | 1–8 |
| Players per party | 5 | 5 |

Moving or swapping a party retains its stable key, five slots, and member attendance. Parties cannot move between Main and Sub through these controls. Clicking **Add raid** creates one with an unused party if available. When all parties are allocated, drag an existing party onto that area instead; the source must keep at least one party. Moving the final party into another existing raid removes the now-empty source raid. The last raid of a battlefield cannot be removed. Removing an occupied raid requires a confirmation showing how many players will return to the pool. Members and attendance records are not deleted. Commander/leader selections are cleared if the person no longer belongs to that raid. Removed/recreated raids start with fresh settings.

Existing data without `guildRaidGroups` uses the original Main 4/4/4 and Sub 5/5/4/4 layout. Saved groups use the existing `main_1`–`main_12` and `sub_1`–`sub_18` keys and up to five raid IDs per battlefield. Export/import includes grouping. Concurrent changes to GL organization and GL slots/raid metadata require a reload instead of silently combining incompatible arrangements. Unrelated Siege changes can still merge.

Management rows scroll horizontally; the public page keeps its responsive card design and hides wholly empty raids. Print/PDF preserves raid grouping on A4 landscape. Raids with six to eight parties wrap into two rows of three/four cards for readable names.

## Deployment

1. Apply `supabase/migrations/20261112161807_guild_league_raid_layout.sql` to the target project after the existing app setup. It adds server-side grouping validation, exposes groups only for published GL lineups, and enables MVP on main raids 4/5. It does not rewrite the existing roster.
2. Deploy the updated frontend, including `public/js/guild-raid-controls.js` and the Blade script include, before saving custom arrangements against production. Old public-page code cannot render custom arrangements.
3. Old planner clients that omit the grouping field cannot erase it, and saves that would leave occupied parties outside the saved layout are rejected. Refresh old tabs after deployment.

The local preview uses the configured Supabase project; local saves affect that project's real roster.

## Verification

- `node --test tests/js/*.test.cjs`
- `php artisan test --compact`
- `node tests/browser/guild-raid-drag.cjs` (offline Chrome, synthetic data, in-memory saves; also accepts `--mobile` and `--pdf`)
- `node tests/browser/siege-print.cjs --guild-league`
- `tests/guild_raid_layout.sql` runs transactional synthetic checks and rolls them back; it needs an approved admin in the target database.

## Reverting this feature

No Manage Party files or tables are changed. Before reverting, export the latest lineup and pause roster edits.

Run `sql/guild_league_layout_rollback.sql` with a database administrator connection, then revert only the frontend feature changes and rebuild/redeploy. The rollback restores the prior database function definitions, removes the grouping validator, and removes `guildRaidGroups`. All current party slots/member assignments remain intact and display in the original grouping. The previous client clears commander/leader selections that no longer match their default raid. It does not restore players intentionally removed while using the editor; recover those from an appropriate lineup export if needed.

Do not reset the whole worktree or run unrelated pending migrations. Keep the earlier public empty-raid hiding change when reverting the layout feature. If re-enabling after rollback, use a new migration rather than editing applied migration history.
